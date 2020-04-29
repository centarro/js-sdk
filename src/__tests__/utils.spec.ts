import { generateCartToken, getMappedIncludes, getRelationshipFromMappedIncludes } from '../utils';
import product from '../__mocks__/product_with_includes.json';
test('generate token', () => {
  const firstToken = generateCartToken();
  expect(firstToken).not.toEqual('');

  const secondToken = generateCartToken();
  expect(firstToken).not.toEqual(secondToken);
});

test('mapped include', () => {
  const mappedIncludes = getMappedIncludes(product.included);
  expect(Object.keys(mappedIncludes)).toStrictEqual([
    'product-variation--simple',
    'file',
    'taxonomy-term--special-categories',
    'taxonomy-term--product-categories',
    'taxonomy-term--brands',
  ]);
  const brand = getRelationshipFromMappedIncludes(product.data, 'brand', mappedIncludes);
  if (brand === null || Array.isArray(brand)) {
    throw new Error('brand should not be null or an array');
  }
  expect(brand.attributes.name).toBe("Gentlemen's Hardware");
  const categories = getRelationshipFromMappedIncludes(product.data, 'product_categories', mappedIncludes);
  if (!Array.isArray(categories)) {
    throw new Error('categories is a multi value relationship');
  }
  expect(categories.length).toBe(6);
});
