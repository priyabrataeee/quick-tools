import { Tool } from '../../tool.types';

export const PDF_TOOLS: Tool[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine several PDF files into one, in the order you choose.',
    category: 'pdf',
    icon: 'file-plus',
    keywords: ['combine pdf', 'join', 'append', 'concatenate'],
    added: '2026-04-02',
    popular: true,
    trending: true,
    faqs: [
      { q: 'Are my PDFs uploaded?', a: 'No. Merging happens in your browser using a JavaScript PDF library. The files never leave your device.' },
      { q: 'Is there a file size limit?', a: 'Only the memory available to your browser tab. Very large scanned documents may be slow but generally work.' },
      { q: 'Are bookmarks and forms preserved?', a: 'Page content, images and text are preserved. Interactive form fields and bookmarks are not carried across.' },
    ],
    about: [
      'Merging PDFs is the most requested PDF operation, and almost every free option online asks you to upload confidential documents to a server you know nothing about.',
      'This tool loads each file into memory in your browser, copies the pages into a new document in the order you set, and hands you the result as a download. Nothing is transmitted.',
    ],
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract a page range from a PDF or split it into single pages.',
    category: 'pdf',
    icon: 'scissors',
    keywords: ['extract pages', 'separate', 'page range', 'delete pages'],
    added: '2026-04-02',
    faqs: [
      { q: 'How do I specify pages?', a: 'Use a range list such as 1-3, 7, 10-12. Pages are numbered from one.' },
      { q: 'Can I remove pages instead?', a: 'Yes, switch to remove mode and the listed pages are dropped rather than kept.' },
      { q: 'Does splitting reduce quality?', a: 'No. Pages are copied byte-for-byte into the new document, so there is no re-encoding.' },
    ],
    about: [
      'Splitting a PDF means pulling out the pages you actually need - a single signed page from a contract, one chapter from a manual, or the invoice buried in a bank statement.',
      'This tool parses your page range, copies exactly those pages into a new document and downloads it, all inside your browser.',
    ],
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate all or selected pages of a PDF and save the result.',
    category: 'pdf',
    icon: 'rotate',
    keywords: ['turn pages', 'landscape', 'portrait', 'orientation', 'sideways'],
    added: '2026-04-08',
    faqs: [
      { q: 'Why do scanned pages come out sideways?', a: 'Scanners record the orientation they fed the paper in, which often does not match how the document reads.' },
      { q: 'Can I rotate only some pages?', a: 'Yes, give a page range and only those pages are rotated.' },
      { q: 'Is the rotation permanent?', a: 'It is written into the saved file as a page rotation attribute, so every viewer will honour it.' },
    ],
    about: [
      'A rotated scan is unreadable on a phone and prints wrong, and most viewers only rotate the view rather than saving the change.',
      'This tool applies the rotation to the document itself in 90 degree steps, for every page or a selected range, and gives you a corrected file to download.',
    ],
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    description: 'Turn JPG and PNG images into a single PDF document.',
    category: 'pdf',
    icon: 'file-image',
    keywords: ['jpg to pdf', 'png to pdf', 'photo to pdf', 'scan'],
    added: '2026-04-08',
    faqs: [
      { q: 'Which image formats work?', a: 'JPEG and PNG are embedded directly. Other formats are converted to PNG first by your browser.' },
      { q: 'Can I choose the page size?', a: 'Yes - fit each page to its image, or use A4 or US Letter with the image centred and scaled to fit.' },
      { q: 'Can I reorder the images?', a: 'Yes, drag them into the order you want before generating the PDF.' },
    ],
    about: [
      'Photographing documents is the fastest way to digitise them, but a folder of loose JPEGs is awkward to send and easy to lose pages from.',
      'This tool embeds your images into a single PDF at full resolution, with your chosen page size and ordering, entirely within your browser.',
    ],
  },
];
