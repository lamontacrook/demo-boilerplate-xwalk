import {
  sampleRUM,
  loadHeader,
  loadFooter,
  decorateButtons as libDecorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  createOptimizedPicture as libCreateOptimizedPicture,
} from './aem.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/*
  * Appends query params to a URL
  * @param {string} url The URL to append query params to
  * @param {object} params The query params to append
  * @returns {string} The URL with query params appended
  * @private
  * @example
  * appendQueryParams('https://example.com', { foo: 'bar' });
  * // returns 'https://example.com?foo=bar'
*/
function appendQueryParams(url, params) {
  const { searchParams } = url;
  params.forEach((value, key) => {
    searchParams.set(key, value);
  });
  url.search = searchParams.toString();
  return url.toString();
}

export function createOptimizedVideo(asset, autoplay = '', playsinline = '', loop = '') {
  const img = asset.querySelector('[data-asset-type="video"]');
  const src = img.alt;
  const ext = src.split('.').pop();

  asset.innerHTML = `<video loop='${loop}' muted='' playsInline='${playsinline}' autoplay='${autoplay}' controls='' poster='${img.src}'>
    <source data-src='${src}' type='video/${ext}' />
  </video>`;

  const video = asset.querySelector('video');
  const source = asset.querySelector('video > source');

  source.src = source.dataset.src;

  video.load();
  video.addEventListener('loadeddata', () => {
    video.setAttribute('autoplay', true);
    video.setAttribute('data-loaded', true);
    video.play();
  });
}

const getDefaultEmbed = (url) => `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
    <iframe src="${url.href}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen=""
      scrolling="no" allow="encrypted-media" title="Content from ${url.hostname}" loading="lazy">
    </iframe>
  </div>`;

export function createOptimizedVideoEmbed(asset) {
  const img = asset.querySelector('[data-asset-type="video"]');
  const parent = asset.parentElement;
  const iframe = getDefaultEmbed(new URL(img.alt));
  const wrapper = document.createElement('div');
  wrapper.className = 'dm-placeholder';
  wrapper.innerHTML = iframe;
  parent.innerHTML = wrapper.outerHTML;
}

/**
 * Creates an optimized picture element for an image.
 * If the image is not an absolute URL, it will be passed to libCreateOptimizedPicture.
 * @param {string} src The image source URL
 * @param {string} alt The image alt text
 * @param {boolean} eager Whether to load the image eagerly
 * @param {object[]} breakpoints The breakpoints to use
 * @returns {Element} The picture element
 *
 */
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 600px)', width: '2000', format: 'webply' }, { width: '750', format: 'webply' }]) {
  const isAbsoluteUrl = /^https?:\/\//i.test(src);

  // Fallback to createOptimizedPicture if src is not an absolute URL
  if (!isAbsoluteUrl) return libCreateOptimizedPicture(src, alt, eager, breakpoints);

  const url = new URL(src);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    delete br.media;
    source.setAttribute('type', 'image/webp');
    const searchParams = new URLSearchParams(br);
    source.setAttribute('srcset', appendQueryParams(url, searchParams));
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    const searchParams = new URLSearchParams({ width: br.width, format: ext });

    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', appendQueryParams(url, searchParams));
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', appendQueryParams(url, searchParams));
    }
  });
  return picture;
}

function whatBlockIsThis(element) {
  let currentElement = element;

  while (currentElement.parentElement) {
    if (currentElement.parentElement.classList.contains('block')) return currentElement.parentElement;
    currentElement = currentElement.parentElement;
    if (currentElement.classList.length > 0) return currentElement.classList[0];
  }
  return null;
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function decorateButtons(main) {
  main.querySelectorAll('img').forEach((img) => {
    let altT = decodeURIComponent(img.alt);

    if (altT && altT.includes('https://delivery-')) {
      try {
        altT = JSON.parse(altT);
        const { altText, deliveryUrl } = altT;
        const url = new URL(deliveryUrl);
        const imgName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
        const block = whatBlockIsThis(img);
        const bp = getMetadata(block);
        let breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }];
        if (bp) {
          const bps = bp.split('|');
          const bpS = bps.map((b) => b.split(',').map((p) => p.trim()));
          breakpoints = bpS.map((n) => {
            const obj = {};
            n.forEach((i) => {
              const t = i.split(/:(.*)/s);
              obj[t[0].trim()] = t[1].trim();
            });
            return obj;
          });
        } else {
          const format = getMetadata(imgName.toLowerCase().replace('.', '-'));
          const formats = format.split('|');
          const formatObj = {};
          formats.forEach((i) => {
            const [a, b] = i.split('=');
            formatObj[a] = b;
          });
          breakpoints = breakpoints.map((n) => (
            { ...n, ...formatObj }
          ));
        }
        const picture = createOptimizedPicture(deliveryUrl, altText, false, breakpoints);
        img.parentElement.replaceWith(picture);
      } catch (error) {
        img.setAttribute('style', 'border:5px solid red');
        img.setAttribute('data-asset-type', 'video');
        img.setAttribute('title', 'Update block to render video.');
      }
    }
  });
  libDecorateButtons(main);
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
  import('./sidekick.js').then(({ initSidekick }) => initSidekick());
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
