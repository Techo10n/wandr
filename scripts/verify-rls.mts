// Verifies RLS from the client's point of view: every check runs with the publishable key,
// as anon or as a signed-in user. The secret key only creates and deletes two throwaway users.
// Run with `npm run verify:rls`. Exits non-zero if any check fails.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const publishable = process.env.EXPO_PUBLIC_SUPABASE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function makeUser(tag: string) {
  const email = `rls-${tag}-${Date.now()}@wandr.test`;
  const password = `rls-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `rls_${tag}_${Date.now() % 1e8}`, display_name: `RLS ${tag}` },
  });
  if (error) throw error;
  const client = createClient(url, publishable, opts);
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, client };
}

async function main() {
  const anon = createClient(url, publishable, opts);
  const a = await makeUser('a');
  const b = await makeUser('b');
  try {
    // B creates a place, a recommendation and a save, through the normal client path.
    const { data: placeId, error: addErr } = await b.client.rpc('add_place', { name_en: 'RLS test place', category: 'food', spent_krw: 9000 });
    if (addErr) throw addErr;
    await b.client.from('saves').insert({ place_id: placeId });
    const { data: bRec } = await admin.from('recommendations').select('id').eq('place_id', placeId).single();

    // Signed out: can read, cannot write.
    for (const table of ['places', 'recommendations', 'profiles', 'place_stats']) {
      const { data, error } = await anon.from(table).select('*').limit(1);
      check(`anon can read ${table}`, !error && (data?.length ?? 0) > 0, error?.message);
    }
    {
      const { error } = await anon.from('places').insert({ name_en: 'anon place', category: 'food' });
      check('anon cannot insert a place', !!error, error?.message);
      const { error: rErr } = await anon.from('recommendations').insert({ place_id: placeId, user_id: b.id, note: 'anon' });
      check('anon cannot insert a recommendation', !!rErr, rErr?.message);
      const { data } = await anon.from('profiles').update({ bio: 'anon was here' }).eq('id', b.id).select();
      const { data: after } = await admin.from('profiles').select('bio').eq('id', b.id).single();
      check('anon cannot update a profile', (data?.length ?? 0) === 0 && after?.bio !== 'anon was here');
      await anon.from('places').delete().eq('id', placeId);
      const { data: still } = await admin.from('places').select('id').eq('id', placeId);
      check('anon cannot delete a place', still?.length === 1);
      const { data: saves, error: sErr } = await anon.from('saves').select('*');
      check('anon cannot read saves', !!sErr || (saves?.length ?? 0) === 0, sErr?.message);
      const { error: rpcErr } = await anon.rpc('add_place', { name_en: 'anon rpc', category: 'food' });
      check('anon cannot call add_place', !!rpcErr, rpcErr?.message);
      const { error: uErr } = await anon.schema('auth' as never).from('users').select('email').limit(1);
      check('auth.users is not exposed', !!uErr, uErr?.message);
      const { data: cols } = await anon.from('profiles').select('*').limit(1);
      check('profiles carry no email', !!cols?.[0] && !('email' in cols[0]));
    }

    // A against B.
    {
      const { data } = await a.client.from('profiles').update({ display_name: 'hacked' }).eq('id', b.id).select();
      const { data: p } = await admin.from('profiles').select('display_name').eq('id', b.id).single();
      check("A cannot edit B's profile", (data?.length ?? 0) === 0 && p?.display_name === 'RLS b');

      const { data: r } = await a.client.from('recommendations').update({ note: 'hacked' }).eq('id', bRec!.id).select();
      const { data: rAfter } = await admin.from('recommendations').select('note').eq('id', bRec!.id).single();
      check("A cannot edit B's recommendation", (r?.length ?? 0) === 0 && rAfter?.note !== 'hacked');

      await a.client.from('recommendations').delete().eq('id', bRec!.id);
      const { data: rStill } = await admin.from('recommendations').select('id').eq('id', bRec!.id);
      check("A cannot delete B's recommendation", rStill?.length === 1);

      const { error: forge } = await a.client.from('recommendations').insert({ place_id: placeId, user_id: b.id, note: 'forged' });
      check('A cannot recommend as B', !!forge, forge?.message);

      const { data: pl } = await a.client.from('places').update({ name_en: 'hacked' }).eq('id', placeId).select();
      const { data: plAfter } = await admin.from('places').select('name_en').eq('id', placeId).single();
      check("A cannot edit B's place", (pl?.length ?? 0) === 0 && plAfter?.name_en === 'RLS test place');

      await a.client.from('places').delete().eq('id', placeId);
      const { data: plStill } = await admin.from('places').select('id').eq('id', placeId);
      check("A cannot delete B's place", plStill?.length === 1);

      const { error: forgePlace } = await a.client.from('places').insert({ name_en: 'forged', category: 'food', created_by: b.id });
      check('A cannot add a place as B', !!forgePlace, forgePlace?.message);

      const { data: bSaves } = await a.client.from('saves').select('*').eq('user_id', b.id);
      const { data: bSavesAdmin } = await admin.from('saves').select('*').eq('user_id', b.id);
      check("A cannot read B's saves", (bSaves?.length ?? 0) === 0 && (bSavesAdmin?.length ?? 0) === 1);
      const { data: ownView } = await b.client.from('saves').select('*');
      check('B can read their own saves', ownView?.length === 1);

      const { error: forgeSave } = await a.client.from('saves').insert({ user_id: b.id, place_id: placeId });
      check('A cannot save as B', !!forgeSave, forgeSave?.message);
      await a.client.from('saves').delete().eq('user_id', b.id);
      const { data: bSavesStill } = await admin.from('saves').select('*').eq('user_id', b.id);
      check("A cannot delete B's saves", bSavesStill?.length === 1);

      const png = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
      const { error: upB } = await a.client.storage.from('avatars').upload(`${b.id}/avatar.jpg`, png, { contentType: 'image/jpeg' });
      check("A cannot upload into B's avatar folder", !!upB, upB?.message);
      const { error: upA } = await a.client.storage.from('avatars').upload(`${a.id}/avatar.jpg`, png, { contentType: 'image/jpeg', upsert: true });
      check('A can upload their own avatar', !upA, upA?.message);
    }

    // Own writes work.
    {
      const { data } = await b.client.from('places').update({ neighborhood: 'Sinchon' }).eq('id', placeId).select();
      check('B can edit their own place', data?.length === 1);
      const { data: r } = await b.client.from('recommendations').update({ note: 'mine' }).eq('id', bRec!.id).select();
      check('B can edit their own recommendation', r?.length === 1);
    }
  } finally {
    await admin.storage.from('avatars').remove([`${a.id}/avatar.jpg`]);
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id); // cascades to B's profile, recommendation and save
    await admin.from('places').delete().eq('name_en', 'RLS test place');
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll RLS checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
