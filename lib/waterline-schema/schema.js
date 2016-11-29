//  ██████╗ ██╗   ██╗██╗██╗     ██████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗
//  ██████╔╝██║   ██║██║██║     ██║  ██║
//  ██╔══██╗██║   ██║██║██║     ██║  ██║
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝
//
//  ███████╗ ██████╗██╗  ██╗███████╗███╗   ███╗ █████╗
//  ██╔════╝██╔════╝██║  ██║██╔════╝████╗ ████║██╔══██╗
//  ███████╗██║     ███████║█████╗  ██╔████╔██║███████║
//  ╚════██║██║     ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║
//  ███████║╚██████╗██║  ██║███████╗██║ ╚═╝ ██║██║  ██║
//  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝
//
// Takes a collection of attributes from a Waterline Collection
// and builds up an initial schema by normalizing into a known format.

var _ = require('@sailshq/lodash');
var validTypes = require('./valid-types');
var validProperties = require('./valid-properties');

module.exports = function schemaBuilder(collections) {
  // Build up a schema object to return
  var schema = {};

  // Validate that collections exists and is an array
  if (_.isUndefined(collections) || !_.isArray(collections)) {
    throw new Error('Invalid collections argument.');
  }

  // Process each collection
  _.each(collections, function normalizeCollection(collectionPrototype) {
    var collection = collectionPrototype.prototype;

    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ┬┌┬┐┌─┐┌┐┌┌┬┐┬┌┬┐┬ ┬
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   │ ││├┤ │││ │ │ │ └┬┘
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ┴─┴┘└─┘┘└┘ ┴ ┴ ┴  ┴
    if(_.has(collection, 'tableName') && !_.has(collection, 'identity')) {
      collection.identity = collection.tableName;
    }

    // Require an identity so the object key can be set
    if(!_.has(collection, 'identity')) {
      throw new Error('A Model must include an identity or tableName attribute');
    }


    //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐┌─┐
    //  ║  ╠═╣║╣ ║  ╠╩╗   │ ││││├┤ └─┐ │ ├─┤│││├─┘└─┐
    //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩   ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴  └─┘
    // Ensure that the legacy values autoCreatedAt and autoUpdatedAt are not
    // set on the collection. If they are, throw an error.
    if (_.has(collection, 'autoCreatedAt')) {
      throw new Error('A model may not contain a top-level `autoCreatedAt` model option. To set an auto incrementing timestamp set the `autoCreatedAt` flag directly on an attribute.');
    }

    if (_.has(collection, 'autoUpdatedAt')) {
      throw new Error('A model may not contain a top-level `autoUpdatedAt` model option. To set an auto incrementing timestamp set the `autoUpdatedAt` flag directly on an attribute.');
    }


    //  ╔═╗╔═╗╔╦╗  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
    //  ╚═╗║╣  ║   ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
    //  ╚═╝╚═╝ ╩   ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
    // EVERY model must contain an attribute that represents the primary key.
    // To find the Primary Key it will be set on the top level model options.

    // Validate that the primary key exists and the attribute it points to exists
    // in the definition.
    if (!_.has(collection, 'primaryKey') || !_.isString(collection.primaryKey)) {
      throw new Error('Could not find a primary key attribute on the model ' + collection.identity + '. All models must contain an attribute that acts as the primary key and is guarenteed to be unique.');
    }

    // Check and make sure the attribute actually exists
    if (!_.has(collection.attributes, collection.primaryKey)) {
      throw new Error('The model ' + collection.identity + ' defined a primary key of ' + collection.primaryKey + ' but that attribute could not be found on the model.');
    }


    //  ╔═╗╔╦╗╔╦╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┌┬┐┌─┐
    //  ╠═╣ ║║ ║║  │  │ ││  │  ├┤ │   │ ││ ││││   │ │ │
    //  ╩ ╩═╩╝═╩╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘   ┴ └─┘
    //  ┌─┐┌─┐┌─┐┬ ┬┌─┐
    //  │  ├─┤│  ├─┤├┤
    //  └─┘┴ ┴└─┘┴ ┴└─┘
    // Store as lowercased so it's easier to lookup.
    schema[collection.identity.toLowerCase()] = {
      primaryKey: collection.primaryKey,
      hasSchema: collection.schema || undefined,
      identity: collection.identity,
      tableName: collection.tableName || collection.identity,
      connection: collection.connection,
      attributes: _.merge({}, collection.attributes),
      // The schema piece will be transformed along the way to reflect the
      // underlying datastructure. i.e. expanding out associations into foreign
      // keys, etc.
      schema: _.merge({}, collection.attributes),
      meta: collection.meta || {}
    };

    // Grab a shorthand reference to the schema object
    var schemaCollection = schema[collection.identity.toLowerCase()];


    //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐┌─┐
    //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤ └─┐
    //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘└─┘
    // Validate each attribute and remove any fields that belong on the schema
    // such as `columnName`.
    _.each(schemaCollection.attributes, function(attribute, attributeName) {
      //  ╔═╗╔╗╔╔═╗╦ ╦╦═╗╔═╗  ┌┐┌┌─┐  ┬┌┐┌┌─┐┌┬┐┌─┐┌┐┌┌─┐┌─┐  ┌┬┐┌─┐┌┬┐┬ ┬┌─┐┌┬┐┌─┐
      //  ║╣ ║║║╚═╗║ ║╠╦╝║╣   ││││ │  ││││└─┐ │ ├─┤││││  ├┤   │││├┤  │ ├─┤│ │ ││└─┐
      //  ╚═╝╝╚╝╚═╝╚═╝╩╚═╚═╝  ┘└┘└─┘  ┴┘└┘└─┘ ┴ ┴ ┴┘└┘└─┘└─┘  ┴ ┴└─┘ ┴ ┴ ┴└─┘─┴┘└─┘
      //  ┌─┐─┐ ┬┬┌─┐┌┬┐  ┌─┐┌┐┌  ┌┬┐┬ ┬┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┬
      //  ├┤ ┌┴┬┘│└─┐ │   │ ││││   │ ├─┤├┤   ││││ │ ││├┤ │
      //  └─┘┴ └─┴└─┘ ┴   └─┘┘└┘   ┴ ┴ ┴└─┘  ┴ ┴└─┘─┴┘└─┘┴─┘
      if (_.isFunction(attribute)) {
        throw new Error('Functions are not allowed as attributes and instance methods on models have been removed. Please change the ' + attributeName + ' on the ' + collection.identity + ' model.');
      }


      //  ╔═╗╔╗╔╔═╗╦ ╦╦═╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐
      //  ║╣ ║║║╚═╗║ ║╠╦╝║╣    │ ├─┤├┤   ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤
      //  ╚═╝╝╚╝╚═╝╚═╝╩╚═╚═╝   ┴ ┴ ┴└─┘  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘
      //  ┬ ┬┌─┐┌─┐  ┌─┐  ┌┬┐┬ ┬┌─┐┌─┐
      //  ├─┤├─┤└─┐  ├─┤   │ └┬┘├─┘├┤
      //  ┴ ┴┴ ┴└─┘  ┴ ┴   ┴  ┴ ┴  └─┘
      // Only if it's not an association
      if (!_.has(attribute, 'type') && !_.has(attribute, 'model') && !_.has(attribute, 'collection')) {
        throw new Error('The attribute ' + attributeName + ' is missing a type property. All attributes must define what their type is.');
      }

      // Ensure the type is valid.
      if (!_.has(attribute, 'model') && !_.has(attribute, 'collection') && _.indexOf(validTypes, attribute.type) < 0) {
        throw new Error('The attribute ' + attributeName + ' on the ' + collection.identity + ' model uses an invalid type - `' + attribute.type + '`.');
      }


      //  ╔═╗╔╗╔╔═╗╦ ╦╦═╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐
      //  ║╣ ║║║╚═╗║ ║╠╦╝║╣    │ ├─┤├┤   ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤
      //  ╚═╝╝╚╝╚═╝╚═╝╩╚═╚═╝   ┴ ┴ ┴└─┘  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘
      //  ┬ ┬┌─┐┌─┐  ┌─┐  ┬─┐┌─┐┌─┐ ┬ ┬┬┬─┐┌─┐  ┌─┐┬  ┌─┐┌─┐
      //  ├─┤├─┤└─┐  ├─┤  ├┬┘├┤ │─┼┐│ ││├┬┘├┤   ├┤ │  ├─┤│ ┬
      //  ┴ ┴┴ ┴└─┘  ┴ ┴  ┴└─└─┘└─┘└└─┘┴┴└─└─┘  └  ┴─┘┴ ┴└─┘
      if (_.has(attribute, 'required') && !_.isBoolean(attribute.required)) {
        throw new Error('The attribute ' + attributeName + ' on the ' + collection.identity + ' model has a `required` flag but the value is not a boolean.');
      }

      // Set to false if it's missing
      if (!_.has(attribute, 'required')) {
        attribute.required = false;
      }


      //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┬┌─┐┌─┐
      //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   ├─┘├┬┘│ │├─┘├┤ ├┬┘ │ │├┤ └─┐
      //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  ┴  ┴└─└─┘┴  └─┘┴└─ ┴ ┴└─┘└─┘
      // If the attribute contains a property that isn't whitelisted, then return
      // an error.
      _.each(attribute, function(propertyValue, propertyName) {
        if (_.indexOf(validProperties, propertyName) < 0) {
          throw new Error('The attribute ' + attributeName + ' contains invalid properties. The property ' + propertyName + ' isn\'t a recognized property.');
        }
      });


      //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐
      //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣    │ ├─┤├┤   ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤
      //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝   ┴ ┴ ┴└─┘  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘
      //  ┌┐┌┌─┐┌┬┐┌─┐
      //  │││├─┤│││├┤
      //  ┘└┘┴ ┴┴ ┴└─┘
      // Check for dots in name
      if (attributeName.match(/\./g)) {
        throw new Error('Invalid Attribute Name: Attributes may not contain a \'.\' character.');
      }

      // Remove the columnName attribute if it exists
      if (_.has(attribute, 'columnName')) {
        delete schemaCollection.attributes[attributeName].columnName;
      }
    }); // </ .each(attributes)


    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ┌─┐┌─┐┬ ┬┌─┐┌┬┐┌─┐
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   └─┐│  ├─┤├┤ │││├─┤
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └─┘└─┘┴ ┴└─┘┴ ┴┴ ┴
    // Expand out the schema so each attribute has a valid columnName.
    _.each(schemaCollection.schema, function(attribute, attributeName) {
      if (!_.has(attribute, 'columnName') && !_.has(attribute, 'collection')) {
        var columnName = attributeName.trim().replace(' ', '_');
        schemaCollection.schema[attributeName].columnName = columnName;
      }
    }); // </ .each(schema)
  }); // </ .each(collections)

  // Return the schema
  return schema;
};