# Google Search surface operations

**Updated:** 24 November 2026  
**Scope:** public website discovery across Google Search, Images, News and Video

## Current Search Console evidence

The verified Search Console property is `sc-domain:vakilahmadmousavi.ir`. For 25 October through 21 November 2026, the connected report returned:

- Web: 19 page rows; 24 clicks on the homepage in the page report.
- Images: 2 page rows, homepage and about; 15 impressions and no clicks.
- Video: no rows.
- News and Google News: no rows.

These dates precede the 24 November publication of the 874 legal-precedent article, so the Image report cannot establish whether that new article image has been indexed. The Video and News reports are search-performance reports, not proof that a URL cannot ever qualify.

## Web search

Every public canonical page must return 200, be crawlable, declare the intended canonical URL, have the correct index directive, appear in the sitemap when indexable, and be reachable through contextual internal links. A successful URL inspection means Google currently reports the URL as indexed; it does not promise ranking or impressions for every candidate phrase.

The internal 5,584-row phrase library is editorial planning data, not observed search demand. One canonical URL owns each distinct search intent. Similar phrase variants belong in useful body content, topics and FAQs; they are not a reason to create duplicate pages. The six editorial-hold clusters remain unserved until their service scope and legal content are verified.

## Google Images

- Use a real HTML image element with a relevant, descriptive alt attribute.
- Put the image next to the relevant article or profile text, with an accurate caption where useful.
- Use descriptive filenames and ensure image URLs are stable, HTTPS, crawlable and indexable.
- Include an image in the XML sitemap only when that same image is visibly present on that page and accurately represents it.
- For CMS articles, the cover image's `useForSeo` setting controls Open Graph, Article schema and sitemap image discovery. Do not reuse the attorney portrait as a generic cover for unrelated legal articles.
- Search Console's Image search type should be reviewed separately from Web. Allow normal crawling and reporting delay before judging newly published images.

The static attorney portrait is visibly used on the homepage and /about. The sitemap now references it only on those two URLs. CMS article cover images continue to be included only when they are enabled for SEO.

## Google News

Google News inclusion is automatic; Publisher Center submission does not guarantee visibility. A News sitemap is appropriate only for a site publishing genuine news and only includes URLs published in the last two days. Do not label evergreen legal guides or promotional service pages as news. A recent legal ruling may be evaluated individually if the article is genuinely timely, original, sourced, and transparently authored. Monitor the News search type in Search Console; never infer eligibility from a `site:` query alone.

## Google Video

No video performance was recorded for the audited period and the repository currently has no published video-watch pages. Video results require real, crawlable video content on an indexed watch page, an accessible stable thumbnail, and accurate video metadata. A VideoObject block without an actual watchable video is not a solution. Build this surface only when original videos are produced and published.

## Measurement rules

- Track Web, Image, Video and News as separate Search Console search types.
- Track the affected landing page and the real query rows where Google exposes them; low-volume and anonymized queries may be omitted.
- Distinguish index status, impressions, clicks, visits, contact clicks and successful enquiries.
- Do not invent Iran-specific search volume from a US/English keyword database.
- Never guarantee a ranking, a rich result, News inclusion or Video inclusion from metadata or schema alone.
