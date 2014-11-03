exports.vendor = function(tree) {
  removeFiles(tree.dependencies);
  removeFiles(tree.locals);
};

function removeFiles(deps) {
  Object.keys(deps).forEach(function(name) {
    var dep = deps[name];
    delete dep.dependencies;
    dep.node = {name: dep.node.name};
  });
}

exports.app = function(tree) {
  tree.node = {name: tree.node.name};
};
