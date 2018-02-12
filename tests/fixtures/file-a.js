console.log('=-=');
import('./module-a.js');
require.ensure([ './home.js' ], function() {
  require('./home.js');
});
// import('./home.js');
import(/* webpackChunkName: "vendor" */'./vendor.js');
