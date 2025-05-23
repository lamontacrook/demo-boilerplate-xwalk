import { createOptimizedPicture } from '../../scripts/scripts.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) 
        div.className = 'cards-card-image';
      else if (div.children.length === 1 && div.querySelector('p > a')) 
        div.className = 'cards-card-dm-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  
  ul.querySelectorAll('.cards-card-dm-image > p > a').forEach((anchor) => {
    console.log(anchor.href);
    const optimizedPic = createOptimizedPicture(anchor.href, 'DM Image', false, [{ width: '750' }]);
    moveInstrumentation(anchor, optimizedPic.querySelector('img'));
    anchor.closest('p').replaceWith(optimizedPic);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
