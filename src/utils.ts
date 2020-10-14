export const generateCartToken = (): string => Math.random().toString(36).substr(2);

interface MappedIncludes {
  [type: string]: any;
}

export const getMappedIncludes = (included?: ResourceObject[]) => {
  const mappedIncludes: MappedIncludes = {};
  if (!included) {
    return mappedIncludes;
  }

  return included.reduce((accumulator: MappedIncludes, include: ResourceObject) => {
    accumulator[include.type] = accumulator[include.type] || {};
    accumulator[include.type][include.id] = include;
    return accumulator;
  }, mappedIncludes);
};

export const getRelationshipFromMappedIncludes = (
  resourceObject: ResourceObject,
  field: string,
  mappedIncludes: MappedIncludes,
): null | ResourceObject[] | ResourceObject => {
  const relationship = resourceObject.relationships[field];
  if (!relationship) {
    return null;
  }
  if (!relationship.data) {
    return null;
  }
  if (Array.isArray(relationship.data)) {
    return relationship.data.map((identifier: ResourceIdentifier) => {
      return mappedIncludes[identifier.type][identifier.id];
    });
  } else {
    return mappedIncludes[relationship.data.type][relationship.data.id];
  }
};
