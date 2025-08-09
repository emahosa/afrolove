create or replace function increment_vote_count(entry_id uuid)
returns void
language plpgsql
as $$
begin
  update contest_entries
  set vote_count = vote_count + 1
  where id = entry_id;
end;
$$;
