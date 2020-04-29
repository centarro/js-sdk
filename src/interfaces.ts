interface TopLevelDocument {
  data?: ResourceObject | ResourceObject[];
  errors?: ErrorObject[];
  meta?: any;
  jsonapi?: any;
  links?: any;
  included?: ResourceObject[];
}
interface ResourceIdentifier {
  type: string;
  id: string;
  meta?: any;
}
interface ResourceObject extends ResourceIdentifier {
  attributes: { [key: string]: any };
  relationships: {
    // @todo figure out why we need to also add undefined.
    [key: string]: Relationship | undefined;
  };
  links?: any;
  meta?: any;
}
interface Relationship {
  // @todo ResourceIdentifier | ResourceIdentifier[]
  data?: any | undefined;
  links?: any;
  meta?: any;
}
interface ErrorObject {
  id?: string | number;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

interface RequestOptions {
  includes?: string[];
  fields?: RequestFields;
  filter?: RequestFilters;
  page?: {
    limit: number;
    offset: number;
  };
  sort?: string[];
}

interface RequestFields {
  [key: string]: string[];
}
interface RequestFilters {
  // @todo support more expansive filters.
  // this supports `'filter[special_categories.entity.name]': 'Featured'`
  // but not `'filter[field_premium][value]': true`
  [key: string]: string;
}
