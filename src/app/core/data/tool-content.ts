/**
 * Extended per-tool copy for the pages that carry the most search traffic.
 *
 * The registry in data/tools/*.ts gives every tool a short about and a set
 * of FAQs, which is enough for a long-tail page. The pages below compete for
 * terms people actually search in volume, so they get two more sections: a
 * technically specific account of what runs in the browser, and concrete
 * situations the tool is for.
 *
 * This lives apart from the registry deliberately. It is optional, it is only
 * populated where there is something real to say, and keeping it separate means
 * a page never ends up with a section of padding written to fill a template.
 */

export interface ToolContent {
  /**
   * What actually executes on the visitor's device — named APIs, real limits.
   * This is the section that substantiates the site's central claim, so it is
   * specific rather than reassuring.
   */
  howItWorks: string[];
  /** Concrete situations, not restatements of the tool's description. */
  useCases: string[];
}

export const TOOL_CONTENT: Record<string, ToolContent> = {
  'json-formatter': {
    howItWorks: [
      'Formatting runs through the browser’s own JSON implementation: JSON.parse turns your text into a JavaScript value, and JSON.stringify writes it back out with the indentation you picked. Because both sides of that round trip are the engine’s native parser — the same one your application uses — the output is guaranteed to be valid JSON, and anything the formatter accepts your code will accept too.',
      'That choice has a visible consequence: the parser follows RFC 8259 strictly, so trailing commas, single-quoted strings, comments and unquoted keys are all rejected rather than quietly repaired. When parsing fails, the browser reports the character offset of the first token it could not accept, which is mapped back to a line and column and shown against your input.',
      'Key order is preserved exactly as written. JSON objects are formally unordered, but every mainstream engine keeps insertion order for string keys, so a formatted document diffs cleanly against the original in Git.',
    ],
    useCases: [
      'Reading a minified API response you have just pulled out of a browser’s network tab.',
      'Finding the exact position of a syntax error in a config file that a build tool has only told you is "invalid".',
      'Normalising indentation across a set of fixture files so that code review shows real changes instead of whitespace.',
      'Inspecting a payload that contains customer data, credentials or anything else you should not paste into a third-party server.',
    ],
  },

  'jwt-decoder': {
    howItWorks: [
      'A JSON Web Token is three Base64url-encoded segments joined by dots: header, payload, and signature. Decoding the first two is pure string work — the padding is restored, atob converts each segment to bytes, and those bytes are parsed as JSON. No key is needed for this, which is exactly why a JWT should never be treated as a secure container for anything you would not show the token holder.',
      'Registered time claims are rendered as readable dates: exp (expiry), iat (issued at) and nbf (not before) are Unix timestamps in seconds, and comparing exp to the current time is usually the answer to "why is this request suddenly 401".',
      'The signature is deliberately not verified. Verification requires the issuer’s secret or public key, and a tool that asked you to paste a signing secret into a web page would be asking for the one value that must never leave your infrastructure. Decoding tells you what a token claims; only your own backend can tell you whether to believe it.',
    ],
    useCases: [
      'Checking whether an access token has expired before assuming the API itself is broken.',
      'Confirming which scopes, roles or tenant id an identity provider actually issued, rather than what the documentation says it should.',
      'Comparing a token from staging against one from production when authentication works in one environment and not the other.',
      'Inspecting a token from a live system — the case where pasting it into a server-side decoder would mean handing a working credential to a stranger.',
    ],
  },

  'hash-generator': {
    howItWorks: [
      'Hashing uses the Web Crypto API — crypto.subtle.digest — which is the browser’s own audited implementation of SHA-1, SHA-256, SHA-384 and SHA-512, the same primitive used for TLS. Your text is encoded to UTF-8 bytes, digested, and the resulting buffer is rendered as lowercase hexadecimal.',
      'Web Crypto is only available over HTTPS or on localhost, because a hashing function delivered over a connection an attacker can modify offers no assurance at all. That restriction is enforced by the browser, not by this page.',
      'One thing worth being clear about: a hash is a fingerprint, not encryption. It cannot be reversed, but identical input always produces identical output, so a plain hash of a common password is trivially reversed with a lookup table. For storing passwords you want a deliberately slow, salted algorithm such as bcrypt, scrypt or Argon2 — not any of the functions here.',
    ],
    useCases: [
      'Verifying that a downloaded file matches the SHA-256 checksum its publisher listed.',
      'Producing a stable cache key or content fingerprint from a string.',
      'Checking that two files with different names are byte-for-byte identical.',
      'Generating a test digest while developing, without sending the input to an online hashing service that logs it.',
    ],
  },

  'regex-tester': {
    howItWorks: [
      'Patterns are compiled with the browser’s native RegExp and run against your test text with the flags you select. This matters more than it sounds: JavaScript’s regular expression dialect is not PCRE, and a pattern copied from a PHP, Python or Perl example may behave differently or fail to compile. Testing here tells you how the pattern will behave in JavaScript specifically, because it is literally the same engine.',
      'Matches are collected with the global flag and each capture group is listed separately, including named groups from (?<name>...). An invalid pattern surfaces the engine’s own SyntaxError rather than a generic failure.',
      'The number of matches collected is capped. Certain patterns — typically nested quantifiers such as (a+)+ — trigger catastrophic backtracking, where the engine explores an exponential number of paths and the tab locks up. The cap keeps the page responsive, but a pattern that hits it is a pattern to simplify before it reaches production.',
    ],
    useCases: [
      'Building a validation pattern and seeing which of your real-world sample inputs it rejects.',
      'Working out why a pattern that behaves correctly in Python does not match in JavaScript.',
      'Extracting a specific field from log lines by iterating on the pattern against a genuine sample.',
      'Testing against production log excerpts that should not be pasted into a hosted regex service.',
    ],
  },

  'base64-encoder': {
    howItWorks: [
      'Encoding uses the browser’s built-in btoa and atob, wrapped in a TextEncoder and TextDecoder pass. That wrapper is the important part: btoa operates on Latin-1 and throws on any character above U+00FF, so encoding text containing an accent, a Cyrillic character or an emoji fails without it. Converting to UTF-8 bytes first means any Unicode input encodes and round-trips correctly.',
      'Base64 represents three bytes as four ASCII characters, so encoded output is always about 33% larger than the input — worth remembering before embedding a large image as a data URI.',
      'Base64 is an encoding, not encryption. It is trivially reversible by anyone, and offers no confidentiality whatsoever. It exists to move binary data safely through channels that only handle text.',
    ],
    useCases: [
      'Embedding a small image or font directly in CSS or HTML as a data URI to remove a request.',
      'Decoding a Base64 field from an API response, a config file or an email header to see what it holds.',
      'Preparing a value for a header or URL where raw binary would not survive transit.',
      'Decoding a payload that contains credentials — the reversibility of Base64 is exactly why that should happen locally.',
    ],
  },

  'sql-formatter': {
    howItWorks: [
      'The formatter tokenises your statement and re-indents it around SQL’s structural keywords: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY and the JOIN family each start a new line, and the parenthesis depth of subqueries drives the indentation so nested queries visibly nest.',
      'String literals and quoted identifiers are preserved untouched, so a keyword appearing inside a quoted string is never mistaken for a structural keyword and reformatted.',
      'It is a formatter, not a parser or a linter: it will not tell you that a column does not exist or that a join is missing a condition. It changes only whitespace and keyword casing, so the statement it produces is the statement you gave it.',
    ],
    useCases: [
      'Making a long generated query — from an ORM or a BI tool — readable enough to review.',
      'Normalising formatting before committing a migration, so future diffs show logic changes rather than reflowed whitespace.',
      'Understanding an inherited report query by seeing its subquery structure laid out.',
      'Formatting a query containing real table names and business logic without sending it to a hosted formatter.',
    ],
  },

  'text-compare': {
    howItWorks: [
      'The comparison uses Myers’ O(ND) difference algorithm — the same approach underneath git diff. It finds the shortest edit script that turns the left text into the right one, which is why it aligns matching blocks correctly instead of declaring everything after a single inserted line to be different.',
      'Identical prefixes and suffixes are trimmed before the algorithm runs, so comparing two large documents that differ in the middle is fast. Within a changed line, a second word-level pass highlights the specific words that moved, unless the line has changed so completely that highlighting every word would add nothing.',
      'The ignore options change what counts as equal rather than editing your text: ignoring case, collapsing runs of whitespace, or skipping blank lines entirely. Your input is never modified — only the comparison is.',
    ],
    useCases: [
      'Finding what changed between two versions of a config file or a contract.',
      'Checking whether a copied block of code differs from the original in any way beyond formatting.',
      'Diffing two API responses to isolate the field that changed.',
      'Comparing documents under NDA, where a hosted diff tool would mean uploading both versions.',
    ],
  },

  'word-counter': {
    howItWorks: [
      'Words are counted by splitting on Unicode whitespace and discarding empty results, which handles multiple spaces, tabs and line breaks without inflating the total. Characters are counted both with and without spaces, because the two are asked for in different contexts.',
      'One subtlety worth knowing: JavaScript strings are UTF-16, so a naive .length counts an emoji or certain CJK characters as two. The count here iterates by code point, so what is reported matches what you would count by eye.',
      'Reading time is derived at roughly 200–250 words per minute, which is the accepted range for adult reading of general prose. Dense technical material runs slower and light narrative faster, so treat it as an estimate rather than a measurement.',
    ],
    useCases: [
      'Checking an essay, application or article against a strict word limit before submitting it.',
      'Fitting copy into a meta description, a tweet, or an ad slot with a hard character cap.',
      'Estimating how long a talk will take to deliver from its script.',
      'Counting words in a draft that is confidential — a manuscript, a legal filing, an unpublished report.',
    ],
  },

  'case-converter': {
    howItWorks: [
      'Each conversion is a distinct transformation rather than a single toggle. Sentence case capitalises after terminal punctuation; title case capitalises each significant word while leaving short articles and prepositions lowercase; camelCase, PascalCase, snake_case and kebab-case first split the input on spaces, underscores, hyphens and existing case boundaries, then rejoin it in the target convention.',
      'The splitting step is what makes conversion between programming conventions reliable: getUserID is recognised as three parts, so it becomes get_user_id rather than getuserid.',
      'Case mapping uses the browser’s Unicode-aware toLocaleUpperCase and toLocaleLowerCase, so accented Latin, Greek and Cyrillic characters convert correctly instead of being passed through unchanged.',
    ],
    useCases: [
      'Converting a list of identifiers between the conventions of two languages or APIs.',
      'Fixing a heading that arrived in all caps without retyping it.',
      'Normalising imported CSV column names into consistent snake_case.',
      'Turning a list of names or labels into title case for a UI.',
    ],
  },

  'image-compressor': {
    howItWorks: [
      'The image is decoded into an offscreen <canvas> and re-encoded with canvas.toBlob() at the quality level you choose. Every step happens in your device’s memory using the browser’s own image codecs — the same ones it uses to display any image on any page.',
      'Quality maps to the JPEG or WebP encoder’s quantisation setting. Values around 0.8 typically remove most of the file size with no difference visible at normal viewing distance; below about 0.6, artefacts start to show in smooth gradients and around sharp edges.',
      'One consequence of the canvas round trip is worth knowing: EXIF metadata does not survive it. Camera model, timestamp, lens settings and — importantly — GPS coordinates are all dropped. If you are publishing photos, that is a privacy improvement you get for free. If you need the metadata, keep the original.',
    ],
    useCases: [
      'Getting a photo under an upload size limit for a form or a job application.',
      'Reducing page weight before publishing images to a site or a blog post.',
      'Stripping GPS coordinates out of a photo before sharing it publicly.',
      'Compressing pictures of family, documents or ID — the images that have no business being uploaded to a stranger’s server to be made smaller.',
    ],
  },

  'image-resizer': {
    howItWorks: [
      'Resizing draws your image into a canvas at the target dimensions using the browser’s built-in scaling, with image smoothing enabled so downscaling produces a clean result rather than an aliased one. Aspect ratio is locked by default; the second dimension is computed from the first and rounded to whole pixels.',
      'Very large reductions — a 6000px photo down to a 200px thumbnail — look better in stages than in a single step, because a one-shot downscale samples too sparsely and drops fine detail. Where the reduction is severe, the resize runs through intermediate steps.',
      'Upscaling is available but cannot invent detail that was never captured. Enlarging a small image interpolates between the pixels that exist; it will look soft, and no client-side tool can change that.',
    ],
    useCases: [
      'Producing an avatar or thumbnail at the exact pixel dimensions a platform requires.',
      'Cutting a camera photo down to a sensible size for the web before uploading it.',
      'Preparing a batch of images at consistent dimensions for a gallery or product listing.',
      'Resizing a scanned document or ID photo for an application form, without it passing through anyone else’s server.',
    ],
  },

  'merge-pdf': {
    howItWorks: [
      'Each file you select is read with the File API into an ArrayBuffer — a copy in your tab’s memory. The PDF structures are parsed there, the page objects from every document are collected in order, and a new PDF is assembled and handed back as a blob your browser downloads. The files are never sent anywhere.',
      'Merging copies page content along with the resources each page references — fonts, embedded images and vector graphics — so pages look the same in the merged file as they did in the originals. Document-level features that cannot be meaningfully combined, such as form field values and digital signatures, do not survive a merge; a signature covers a specific document, and a merged file is a different document.',
      'Because everything is held in memory, the practical limit is your device’s RAM rather than a server-side upload cap. Very large scanned documents on a phone are the case most likely to run out of room.',
    ],
    useCases: [
      'Combining scanned pages into one document for an application or a claim.',
      'Merging invoices or receipts into a single file for an expense submission.',
      'Assembling separately exported chapters or reports into one deliverable.',
      'Joining documents containing financial, medical or legal information — exactly the files that should not be uploaded to a free web service.',
    ],
  },

  'split-pdf': {
    howItWorks: [
      'The document is parsed in your browser and the pages you select are copied into a new PDF, along with the fonts and images those pages depend on. Pages you do not select are simply not copied, so nothing from them remains in the output.',
      'That last point matters if you are splitting a document to remove sensitive pages. Unlike drawing a black box over content — which leaves the text underneath, selectable and searchable — extracting a page range produces a file that genuinely does not contain the other pages.',
      'The original file on your disk is never modified. The result is a new download, and you keep the source exactly as it was.',
    ],
    useCases: [
      'Pulling a single signed page out of a long contract to send on.',
      'Splitting a bank or card statement to share only the transactions a claim requires.',
      'Extracting one chapter from a large manual to send to someone.',
      'Removing pages containing personal information before circulating a document.',
    ],
  },

  'color-converter': {
    howItWorks: [
      'Conversions are computed directly from the colour space definitions rather than looked up. HEX to RGB is a base-16 parse; RGB to HSL finds the maximum and minimum channel values and derives hue, saturation and lightness from their relationship. Every conversion is exact and reversible, so round-tripping a colour returns the value you started with.',
      'HSL is included because it is the space that matches how people describe colour changes. "Slightly darker" is a single lightness adjustment in HSL, but requires changing all three channels in RGB, usually by unequal amounts.',
      'Alpha is carried through every format that supports it — eight-digit hex, rgba() and hsla() — so transparency survives conversion instead of being silently dropped.',
    ],
    useCases: [
      'Converting a hex value from a design file into the hsl() form a CSS variable system uses.',
      'Producing a lighter or darker variant of a brand colour by changing lightness alone.',
      'Translating a colour from a style guide into the format a particular framework expects.',
      'Reading the exact value behind a colour you have been given in an unfamiliar notation.',
    ],
  },

  'contrast-checker': {
    howItWorks: [
      'The contrast ratio is computed exactly as WCAG 2.1 defines it. Each colour’s sRGB channels are linearised by reversing the gamma curve, combined into relative luminance with the coefficients 0.2126 R, 0.7152 G and 0.0722 B — weighted for the eye’s differing sensitivity to each — and the two luminances are compared as (lighter + 0.05) / (darker + 0.05).',
      'The result runs from 1:1 for identical colours to 21:1 for black on white. AA requires 4.5:1 for body text and 3:1 for large text, which WCAG defines as 18pt, or 14pt bold. AAA requires 7:1 and 4.5:1 respectively.',
      'A passing ratio is a floor, not a guarantee. The formula does not model colour blindness, screen glare, or the way very thin fonts read lighter than their colour value suggests. Text that passes at exactly 4.5:1 in a hairline weight is still hard to read.',
    ],
    useCases: [
      'Checking a colour pair against WCAG AA before it ships into a design system.',
      'Finding the minimum lightness adjustment that brings existing brand colours into compliance.',
      'Verifying that a dark-mode palette passes as well as its light counterpart.',
      'Documenting accessibility conformance for an audit or a procurement requirement.',
    ],
  },

  'percentage-calculator': {
    howItWorks: [
      'The tool covers the four percentage questions that get confused with one another: what is X% of Y; X is what percent of Y; the percentage change from X to Y; and reversing a percentage to recover an original value.',
      'The last two are where mistakes usually happen. Percentage change is (new − old) / old, always divided by the *original* value — which is why a rise from 50 to 75 is +50% while the fall back from 75 to 50 is −33%, not −50%. And a 20% discount is reversed by dividing by 0.8, not by adding 20%: taking 20% off 100 gives 80, and adding 20% to 80 gives 96.',
      'Arithmetic uses double-precision floating point, so results are shown rounded. For money, round once at the end rather than at each step, and check the result against the figure the institution concerned actually charges.',
    ],
    useCases: [
      'Working out the original price from a sale price and a discount percentage.',
      'Calculating percentage growth between two reporting periods correctly.',
      'Adding or removing a tax or service charge from a total.',
      'Checking a percentage figure someone else has quoted before you rely on it.',
    ],
  },

  'age-calculator': {
    howItWorks: [
      'Age is calculated by calendar arithmetic rather than by dividing elapsed days by 365.25. Years are counted first, then months, then the remaining days — which is how age is defined legally and conventionally, and it is why the answer changes on your birthday rather than gradually.',
      'Leap years are handled by the date arithmetic itself, so someone born on 29 February gets a correct age in every year; the anniversary is treated as 1 March in common years, which is the convention most jurisdictions use.',
      'All arithmetic runs in your device’s local time zone. If you were born in a different zone from the one you are in now, the day boundary may differ by one from what you expect.',
    ],
    useCases: [
      'Confirming an exact age in years, months and days for a form or an application.',
      'Checking eligibility against an age threshold on a specific future date.',
      'Working out the precise gap between two people’s birthdays.',
      'Calculating an age from a date of birth without entering it into a site that stores it.',
    ],
  },

  'timestamp-converter': {
    howItWorks: [
      'Unix time counts seconds since 1 January 1970 UTC. The converter accepts seconds and milliseconds, distinguishing them by magnitude: a ten-digit value is seconds, a thirteen-digit value is milliseconds. Getting that wrong is the single most common timestamp bug, and it presents as a date in 1970 or one roughly fifty thousand years away.',
      'Each timestamp is shown in UTC and in your device’s local time zone simultaneously, with the offset stated, because most timestamp confusion is really time zone confusion.',
      'Two limits are worth knowing. Values above 2,147,483,647 — 19 January 2038 — overflow a signed 32-bit integer, which still matters in older systems and in some database columns. And JavaScript dates are precise to the millisecond, so nanosecond timestamps from tracing systems lose their tail here.',
    ],
    useCases: [
      'Turning a timestamp from a log line into a readable date while debugging.',
      'Checking whether a token or cache entry’s expiry is in the past.',
      'Producing a Unix timestamp for a specific date to use in a query or a fixture.',
      'Working out whether a discrepancy between two systems is a real gap or a time zone offset.',
    ],
  },
};

/** Extra copy for a tool, or undefined where the registry entry is enough. */
export function contentFor(toolId: string): ToolContent | undefined {
  return TOOL_CONTENT[toolId];
}
