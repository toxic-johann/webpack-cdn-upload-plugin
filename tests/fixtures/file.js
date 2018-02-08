console.log('lol');
import('./module-a.js').then(() => {
  console.log('wow');
}).catch(error => {
  console.error(error);
});
