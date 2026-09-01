import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

/**
 * Every tool is its own lazily loaded route so the initial bundle stays small
 * and each page can be prerendered independently. The import paths must be
 * static literals for the bundler to code-split them.
 */
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'tools',
        loadComponent: () =>
          import('./pages/all-tools/all-tools.component').then((m) => m.AllToolsComponent),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./pages/favorites/favorites.component').then((m) => m.FavoritesComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent),
      },
      {
        path: 'category/:id',
        loadComponent: () =>
          import('./pages/category/category.component').then((m) => m.CategoryComponent),
      },

      // ---------------------------------------------------------------------
      // Developer tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/json-formatter',
        loadComponent: () =>
          import('./tools/developer/json-formatter/json-formatter.component').then(
            (m) => m.JsonFormatterComponent,
          ),
      },
      {
        path: 'tools/json-validator',
        loadComponent: () =>
          import('./tools/developer/json-validator/json-validator.component').then(
            (m) => m.JsonValidatorComponent,
          ),
      },
      {
        path: 'tools/json-minifier',
        loadComponent: () =>
          import('./tools/developer/json-minifier/json-minifier.component').then(
            (m) => m.JsonMinifierComponent,
          ),
      },
      {
        path: 'tools/jwt-decoder',
        loadComponent: () =>
          import('./tools/developer/jwt-decoder/jwt-decoder.component').then(
            (m) => m.JwtDecoderComponent,
          ),
      },
      {
        path: 'tools/uuid-generator',
        loadComponent: () =>
          import('./tools/developer/uuid-generator/uuid-generator.component').then(
            (m) => m.UuidGeneratorComponent,
          ),
      },
      {
        path: 'tools/regex-tester',
        loadComponent: () =>
          import('./tools/developer/regex-tester/regex-tester.component').then(
            (m) => m.RegexTesterComponent,
          ),
      },
      {
        path: 'tools/cron-generator',
        loadComponent: () =>
          import('./tools/developer/cron-generator/cron-generator.component').then(
            (m) => m.CronGeneratorComponent,
          ),
      },
      {
        path: 'tools/base64-encoder',
        loadComponent: () =>
          import('./tools/developer/base64-encoder/base64-encoder.component').then(
            (m) => m.Base64EncoderComponent,
          ),
      },
      {
        path: 'tools/url-encoder',
        loadComponent: () =>
          import('./tools/developer/url-encoder/url-encoder.component').then(
            (m) => m.UrlEncoderComponent,
          ),
      },
      {
        path: 'tools/html-entity-encoder',
        loadComponent: () =>
          import('./tools/developer/html-entity-encoder/html-entity-encoder.component').then(
            (m) => m.HtmlEntityEncoderComponent,
          ),
      },
      {
        path: 'tools/timestamp-converter',
        loadComponent: () =>
          import('./tools/developer/timestamp-converter/timestamp-converter.component').then(
            (m) => m.TimestampConverterComponent,
          ),
      },
      {
        path: 'tools/hash-generator',
        loadComponent: () =>
          import('./tools/developer/hash-generator/hash-generator.component').then(
            (m) => m.HashGeneratorComponent,
          ),
      },
      {
        path: 'tools/sql-formatter',
        loadComponent: () =>
          import('./tools/developer/sql-formatter/sql-formatter.component').then(
            (m) => m.SqlFormatterComponent,
          ),
      },
      {
        path: 'tools/xml-formatter',
        loadComponent: () =>
          import('./tools/developer/xml-formatter/xml-formatter.component').then(
            (m) => m.XmlFormatterComponent,
          ),
      },
      {
        path: 'tools/yaml-formatter',
        loadComponent: () =>
          import('./tools/developer/yaml-formatter/yaml-formatter.component').then(
            (m) => m.YamlFormatterComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Text tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/text-compare',
        loadComponent: () =>
          import('./tools/text/text-compare/text-compare.component').then(
            (m) => m.TextCompareComponent,
          ),
      },
      {
        path: 'tools/word-counter',
        loadComponent: () =>
          import('./tools/text/word-counter/word-counter.component').then(
            (m) => m.WordCounterComponent,
          ),
      },
      {
        path: 'tools/character-counter',
        loadComponent: () =>
          import('./tools/text/character-counter/character-counter.component').then(
            (m) => m.CharacterCounterComponent,
          ),
      },
      {
        path: 'tools/reading-time',
        loadComponent: () =>
          import('./tools/text/reading-time/reading-time.component').then(
            (m) => m.ReadingTimeComponent,
          ),
      },
      {
        path: 'tools/remove-duplicate-lines',
        loadComponent: () =>
          import('./tools/text/remove-duplicate-lines/remove-duplicate-lines.component').then(
            (m) => m.RemoveDuplicateLinesComponent,
          ),
      },
      {
        path: 'tools/sort-lines',
        loadComponent: () =>
          import('./tools/text/sort-lines/sort-lines.component').then((m) => m.SortLinesComponent),
      },
      {
        path: 'tools/reverse-text',
        loadComponent: () =>
          import('./tools/text/reverse-text/reverse-text.component').then(
            (m) => m.ReverseTextComponent,
          ),
      },
      {
        path: 'tools/case-converter',
        loadComponent: () =>
          import('./tools/text/case-converter/case-converter.component').then(
            (m) => m.CaseConverterComponent,
          ),
      },
      {
        path: 'tools/slug-generator',
        loadComponent: () =>
          import('./tools/text/slug-generator/slug-generator.component').then(
            (m) => m.SlugGeneratorComponent,
          ),
      },
      {
        path: 'tools/lorem-ipsum',
        loadComponent: () =>
          import('./tools/text/lorem-ipsum/lorem-ipsum.component').then(
            (m) => m.LoremIpsumComponent,
          ),
      },
      {
        path: 'tools/remove-extra-spaces',
        loadComponent: () =>
          import('./tools/text/remove-extra-spaces/remove-extra-spaces.component').then(
            (m) => m.RemoveExtraSpacesComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Image tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/image-compressor',
        loadComponent: () =>
          import('./tools/image/image-compressor/image-compressor.component').then(
            (m) => m.ImageCompressorComponent,
          ),
      },
      {
        path: 'tools/image-resizer',
        loadComponent: () =>
          import('./tools/image/image-resizer/image-resizer.component').then(
            (m) => m.ImageResizerComponent,
          ),
      },
      {
        path: 'tools/crop-image',
        loadComponent: () =>
          import('./tools/image/crop-image/crop-image.component').then((m) => m.CropImageComponent),
      },
      {
        path: 'tools/image-converter',
        loadComponent: () =>
          import('./tools/image/image-converter/image-converter.component').then(
            (m) => m.ImageConverterComponent,
          ),
      },
      {
        path: 'tools/image-to-base64',
        loadComponent: () =>
          import('./tools/image/image-to-base64/image-to-base64.component').then(
            (m) => m.ImageToBase64Component,
          ),
      },
      {
        path: 'tools/base64-to-image',
        loadComponent: () =>
          import('./tools/image/base64-to-image/base64-to-image.component').then(
            (m) => m.Base64ToImageComponent,
          ),
      },
      {
        path: 'tools/color-palette-extractor',
        loadComponent: () =>
          import('./tools/image/color-palette-extractor/color-palette-extractor.component').then(
            (m) => m.ColorPaletteExtractorComponent,
          ),
      },
      {
        path: 'tools/favicon-generator',
        loadComponent: () =>
          import('./tools/image/favicon-generator/favicon-generator.component').then(
            (m) => m.FaviconGeneratorComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // PDF tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/merge-pdf',
        loadComponent: () =>
          import('./tools/pdf/merge-pdf/merge-pdf.component').then((m) => m.MergePdfComponent),
      },
      {
        path: 'tools/split-pdf',
        loadComponent: () =>
          import('./tools/pdf/split-pdf/split-pdf.component').then((m) => m.SplitPdfComponent),
      },
      {
        path: 'tools/rotate-pdf',
        loadComponent: () =>
          import('./tools/pdf/rotate-pdf/rotate-pdf.component').then((m) => m.RotatePdfComponent),
      },
      {
        path: 'tools/images-to-pdf',
        loadComponent: () =>
          import('./tools/pdf/images-to-pdf/images-to-pdf.component').then(
            (m) => m.ImagesToPdfComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // CSS tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/box-shadow-generator',
        loadComponent: () =>
          import('./tools/css/box-shadow-generator/box-shadow-generator.component').then(
            (m) => m.BoxShadowGeneratorComponent,
          ),
      },
      {
        path: 'tools/gradient-generator',
        loadComponent: () =>
          import('./tools/css/gradient-generator/gradient-generator.component').then(
            (m) => m.GradientGeneratorComponent,
          ),
      },
      {
        path: 'tools/border-radius-generator',
        loadComponent: () =>
          import('./tools/css/border-radius-generator/border-radius-generator.component').then(
            (m) => m.BorderRadiusGeneratorComponent,
          ),
      },
      {
        path: 'tools/clamp-generator',
        loadComponent: () =>
          import('./tools/css/clamp-generator/clamp-generator.component').then(
            (m) => m.ClampGeneratorComponent,
          ),
      },
      {
        path: 'tools/flexbox-generator',
        loadComponent: () =>
          import('./tools/css/flexbox-generator/flexbox-generator.component').then(
            (m) => m.FlexboxGeneratorComponent,
          ),
      },
      {
        path: 'tools/grid-generator',
        loadComponent: () =>
          import('./tools/css/grid-generator/grid-generator.component').then(
            (m) => m.GridGeneratorComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Colour tools
      // ---------------------------------------------------------------------
      {
        path: 'tools/color-converter',
        loadComponent: () =>
          import('./tools/color/color-converter/color-converter.component').then(
            (m) => m.ColorConverterComponent,
          ),
      },
      {
        path: 'tools/contrast-checker',
        loadComponent: () =>
          import('./tools/color/contrast-checker/contrast-checker.component').then(
            (m) => m.ContrastCheckerComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Calculators
      // ---------------------------------------------------------------------
      {
        path: 'tools/percentage-calculator',
        loadComponent: () =>
          import('./tools/calculator/percentage-calculator/percentage-calculator.component').then(
            (m) => m.PercentageCalculatorComponent,
          ),
      },
      {
        path: 'tools/emi-calculator',
        loadComponent: () =>
          import('./tools/calculator/emi-calculator/emi-calculator.component').then(
            (m) => m.EmiCalculatorComponent,
          ),
      },
      {
        path: 'tools/gst-calculator',
        loadComponent: () =>
          import('./tools/calculator/gst-calculator/gst-calculator.component').then(
            (m) => m.GstCalculatorComponent,
          ),
      },
      {
        path: 'tools/sip-calculator',
        loadComponent: () =>
          import('./tools/calculator/sip-calculator/sip-calculator.component').then(
            (m) => m.SipCalculatorComponent,
          ),
      },
      {
        path: 'tools/compound-interest-calculator',
        loadComponent: () =>
          import(
            './tools/calculator/compound-interest-calculator/compound-interest-calculator.component'
          ).then((m) => m.CompoundInterestCalculatorComponent),
      },
      {
        path: 'tools/discount-calculator',
        loadComponent: () =>
          import('./tools/calculator/discount-calculator/discount-calculator.component').then(
            (m) => m.DiscountCalculatorComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Converters
      // ---------------------------------------------------------------------
      {
        path: 'tools/length-converter',
        loadComponent: () =>
          import('./tools/converter/length-converter/length-converter.component').then(
            (m) => m.LengthConverterComponent,
          ),
      },
      {
        path: 'tools/weight-converter',
        loadComponent: () =>
          import('./tools/converter/weight-converter/weight-converter.component').then(
            (m) => m.WeightConverterComponent,
          ),
      },
      {
        path: 'tools/temperature-converter',
        loadComponent: () =>
          import('./tools/converter/temperature-converter/temperature-converter.component').then(
            (m) => m.TemperatureConverterComponent,
          ),
      },
      {
        path: 'tools/area-converter',
        loadComponent: () =>
          import('./tools/converter/area-converter/area-converter.component').then(
            (m) => m.AreaConverterComponent,
          ),
      },
      {
        path: 'tools/speed-converter',
        loadComponent: () =>
          import('./tools/converter/speed-converter/speed-converter.component').then(
            (m) => m.SpeedConverterComponent,
          ),
      },
      {
        path: 'tools/volume-converter',
        loadComponent: () =>
          import('./tools/converter/volume-converter/volume-converter.component').then(
            (m) => m.VolumeConverterComponent,
          ),
      },
      {
        path: 'tools/currency-converter',
        loadComponent: () =>
          import('./tools/converter/currency-converter/currency-converter.component').then(
            (m) => m.CurrencyConverterComponent,
          ),
      },

      // ---------------------------------------------------------------------
      // Date & time
      // ---------------------------------------------------------------------
      {
        path: 'tools/age-calculator',
        loadComponent: () =>
          import('./tools/datetime/age-calculator/age-calculator.component').then(
            (m) => m.AgeCalculatorComponent,
          ),
      },
      {
        path: 'tools/date-difference',
        loadComponent: () =>
          import('./tools/datetime/date-difference/date-difference.component').then(
            (m) => m.DateDifferenceComponent,
          ),
      },
      {
        path: 'tools/working-days-calculator',
        loadComponent: () =>
          import('./tools/datetime/working-days-calculator/working-days-calculator.component').then(
            (m) => m.WorkingDaysCalculatorComponent,
          ),
      },
      {
        path: 'tools/timezone-converter',
        loadComponent: () =>
          import('./tools/datetime/timezone-converter/timezone-converter.component').then(
            (m) => m.TimezoneConverterComponent,
          ),
      },

      // An explicit /404 route exists so the static build produces a page that
      // Cloudflare can serve as 404.html with a real 404 status. The
      // wildcard below handles the same component for client-side navigation.
      {
        path: '404',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
