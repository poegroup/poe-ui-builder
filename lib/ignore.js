exports.vendor = function(tree) {
  var deps = tree.dependencies;
  Object.keys(deps).forEach(function(name) {
    var dep = deps[name];
    delete dep.dependencies;
    dep.node = {name: dep.node.name};
  });
};

exports.app = function(tree) {
  tree.node = {name: tree.node.name};
};
