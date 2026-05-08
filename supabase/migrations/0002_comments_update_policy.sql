-- Strengthen UPDATE policy to prevent author_id reassignment
drop policy if exists "comments_update_own" on public.comments;

create policy "comments_update_own"
  on public.comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
