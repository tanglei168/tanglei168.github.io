import { useEffect, useRef, useState } from 'preact/hooks'
import { supabase } from '../../lib/supabase'

interface Comment {
  id: string
  content: string
  created_at: string
  is_deleted: boolean
  author: { username: string; avatar_url: string | null }
}

interface Props {
  postSlug: string
}

export default function Comments({ postSlug }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [user, setUser] = useState<any>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadComments()
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    // realtime
    const channel = supabase
      .channel(`comments:${postSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_slug=eq.${postSlug}` }, () => loadComments())
      .subscribe()
    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [postSlug])

  async function loadComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, is_deleted, author:profiles(username, avatar_url)')
      .eq('post_slug', postSlug)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
    if (!error && data) setComments(data as any)
  }

  async function submit() {
    if (!draft.trim() || !user) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('comments').insert({
      post_slug: postSlug,
      author_id: user.id,
      content: draft.trim(),
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDraft('')
    if (textareaRef.current) textareaRef.current.value = ''
  }

  const signIn = async (provider: 'github' | 'google') => {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } })
  }

  return (
    <section class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 class="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
        评论 {comments.length > 0 && <span class="text-gray-400 font-normal text-base">({comments.length})</span>}
      </h2>

      {user ? (
        <div class="mb-8">
          <textarea
            ref={textareaRef}
            onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
            class="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            rows={3}
            maxLength={2000}
            placeholder="写下你的想法..."
          />
          <div class="flex items-center justify-between mt-2">
            {error && <p class="text-xs text-red-500">{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !draft.trim()}
              class="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
            >
              {loading ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      ) : (
        <div class="mb-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">登录后发表评论</p>
          <div class="flex items-center justify-center gap-3">
            <button
              onClick={() => signIn('github')}
              class="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub 登录
            </button>
            <button
              onClick={() => signIn('google')}
              class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google 登录
            </button>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">还没有评论，来留下第一条吧</p>
      ) : (
        <ul class="space-y-6">
          {comments.map((c) => (
            <li key={c.id} class="flex gap-3">
              <div class="shrink-0">
                {c.author.avatar_url ? (
                  <img src={c.author.avatar_url} alt={c.author.username} class="w-8 h-8 rounded-full" />
                ) : (
                  <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                    {c.author.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{c.author.username}</span>
                  <time class="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('zh-CN')}</time>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
