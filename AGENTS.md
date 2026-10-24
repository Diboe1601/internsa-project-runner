<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Student profile reads and writes use the existing external database client, with user-keyed React Query caching, change subscriptions and polling fallback; this keeps completion based on saved account data without depending on realtime publication settings.
- Profile completion is calculated in a shared pure function from persisted profile fields so unsaved edits cannot change the saved completion indicator.
