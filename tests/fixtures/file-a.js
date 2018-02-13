console.log('I am file-a');
// import('./module-a.js');
import('./file.js');
require.ensure([ './home.js' ], function() {
  require('./home.js');
});
// import('./home.js');
import(/* webpackChunkName: "vendor" */'./vendor.js');
