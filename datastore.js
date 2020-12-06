const {Datastore} = require('@google-cloud/datastore');

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore()

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}