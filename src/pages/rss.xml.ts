import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'

export async function GET(context: APIContext) {
  const siteUrl = context.site?.href || 'https://tanglei168.github.io'

  let posts: any[] = []
  try {
    posts = (await getCollection('blog', ({ data }) => !data.draft))
      .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
  } catch {
    posts = []
  }

  const items = posts.map(post => {
    const pubDate = new Date(post.data.date).toUTCString()
    const link = `${siteUrl}/blog/${post.slug}`

    return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      ${post.data.description ? `<description><![CDATA[${post.data.description}]]></description>` : ''}
      ${post.data.category ? `<category>${post.data.category}</category>` : ''}
    </item>`
  }).join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tanglei's Blog</title>
    <link>${siteUrl}</link>
    <description>Tanglei 的个人博客 - Growth Hacker 成长之路</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(rss.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
