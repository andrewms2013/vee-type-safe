import { describe, it }  from 'mocha';
import { assert }        from 'chai';
import { 
    conforms,
    defaultIfNotConforms,
    isPositiveInteger, 
    TypeDescription, 
    exactlyConforms,
    optional,
    mismatch,
    duckMismatch,
    MismatchInfo,
    PathArray,
    tdSet
} from '../lib/index';
describe('conforms', () => {
    it('should work as typeof when being forwarded a primitive type name as type description', () => {
        assert.isTrue(conforms(23,           'number'));
        assert.isTrue(conforms(true,         'boolean'));
        assert.isTrue(conforms(false,        'boolean'));
        assert.isTrue(conforms(null,         'object'));
        assert.isTrue(conforms(undefined,    'undefined'));
        assert.isTrue(conforms(() => {},     'function'));
        assert.isTrue(conforms({prop: null}, 'object'));
        assert.isTrue(conforms(Symbol(),     'symbol'));
        assert.isTrue(conforms(2323n,        'bigint'));
    });

    it('should work with objects as type descriptions', () => {
        assert.isTrue(conforms({prop: 'lala'}, {prop: 'string'}));
        assert.isTrue(conforms(
            {
                prop: 'lala',
                prop2: true,
                obj: {
                    obj: [23, 43]
                },
                someExcessProperty: null
            },
            {
                prop: 'string',
                prop2: 'boolean',
                obj: {
                    obj: ['number', 'number']
                }
            }));
    });
    it('should recognize one-item TD array as a random length array', () => {
        assert.isTrue(conforms(
            [{id: 22}, {id: 75}, {id: 55}],
            [{id: 'number'}]
        ));
        assert.isTrue(conforms(
            [],
            [{id: 'number'}]
        ));
        assert.isTrue(conforms(
            [{id: 22}],
            [{id: 'number'}]
        ));
    });
    it('should work with arrays as type descriptions', () => {
        assert.isTrue(conforms(
            // tslint:disable-next-line no-magic-numbers
            [true, null, 22, 'str'],
            ['boolean', 'object', 'number', 'string']
        ));
    });
    it ('should return true if type description is an empty array, and suspect is array of any type', () => {
        assert.isTrue(conforms([1, 2, null, false], []));
        assert.isFalse(conforms({ someObj: true}, []));
        assert.isTrue(conforms([], []));
    });

    it('should take empty arrays and empty objects apart', () => {
        assert.isTrue(conforms([], ['string']));
        assert.isTrue(conforms({}, {}));
        assert.isFalse(conforms({}, [{objects: 'number'}]));
        assert.isFalse(conforms([], {}));
    });
    it('should try to match each TD in a Set', () => {
        assert.isTrue(conforms(
            42, tdSet([{obj: 'number'}, 'string', 'number', ['boolean']])
        ));
        assert.isFalse(conforms(
            {}, tdSet([{obj: 'number'}, 'string', 'number', ['boolean']])
        ));

    });
    it('should use given predicate to validate the suspect', () => {
        assert.isTrue(conforms(23, (suspect): suspect is number => suspect === 23));
        assert.isTrue(conforms('str', (suspect): suspect is string => suspect === 'str'));
        assert.isTrue(conforms({
            prop: 'Ruslan',
            enum: 43
        }, {
            prop: 'string',
            enum: (suspect): suspect is 58 | 4 | 43 => (
                typeof suspect === 'number' && [58, 4, 43].includes(suspect)
            )
        }));
        assert.isFalse(conforms(true, _suspect => false));
        assert.isFalse(conforms({}, {
            id: 'number',
            login: 'string',
            fullname: 'string',
            registeredAt: _suspect => true,
            avaUrl: 'string',
            isDisabled: 'boolean',
        }));
    });
});

describe('defaultIfNotConforms', () => {
    it(`should return default value if suspect doesn't conform to given TD`, () => {
        assert.equal(
            defaultIfNotConforms('number', null, 1),
            1
        );
        const defaultObj = {ojb: 'str'};
        assert.equal(
            defaultIfNotConforms(
            { ojb: 'string'}, { jjj: 'st'}, defaultObj
            ),
            defaultObj
        );
        assert.equal(
            defaultIfNotConforms(isPositiveInteger, 0, 78),
            78
        );
    });

    it(`should return suspect value if it conforms to given TD`, () => {
       assert.equal(defaultIfNotConforms(
           'string', 'sus', 'strdefault'
           ),
           'sus'
       );
       assert.equal(defaultIfNotConforms(
           isPositiveInteger, 32, 1
           ),32
       );
    });
});


describe('exactlyConforms', () => {
    it(`should return false for excess properties`, () => {
        assert.isFalse(exactlyConforms(
        {
            prop: 1,
            ex: true
        },
        {
            prop: 'number'
        }
        ));
    });

    it(`should return true if TD allows optional properties`, () => {
        assert.isTrue(exactlyConforms(
        {
            prop: 's'
        },
        {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number')
        }  
        ));
        assert.isTrue(exactlyConforms(
        {
            prop: 's'
        },
        {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number'),
            opt2: optional('string')
        }  
        ));

        assert.isTrue(exactlyConforms(
        {
            prop: 's',
            opt: 23
        },
        {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number')
        }  
        ));
    });
});


describe('mismatch and duckMatch', () => {
    it('should return null result when good match', () => {
        // tslint:disable-next-line no-magic-numbers
        assert.isNull(mismatch(23,           'number')   );
        assert.isNull(mismatch(true,         'boolean')  );
        assert.isNull(mismatch(false,        'boolean')  );
        assert.isNull(mismatch(null,         'object')   );
        assert.isNull(mismatch(undefined,    'undefined'));
        assert.isNull(mismatch(() => {},     'function') );
        assert.isNull(mismatch({prop: null}, 'object')   );
        assert.isNull(mismatch(Symbol(),     'symbol')   );
        assert.isNull(mismatch({prop: 'lala'}, {prop: 'string'}));
        assert.isNull(duckMismatch(
            {
                prop: 'lala',
                prop2: true,
                obj: {
                    obj: [23, 43]
                },
                someExcessProperty: null
            },
            {
                prop: 'string',
                prop2: 'boolean',
                obj: {
                    obj: ['number', 'number']
                }
            }));
        assert.isNull(mismatch(
            [{id: 22}, {id: 75}, {id: 55}],
            [{id: 'number'}]
        ));
        assert.isNull(mismatch(
            [],
            [{id: 'number'}]
        ));
        assert.isNull(mismatch(
            [{id: 22}],
            [{id: 'number'}]
        ));
        assert.isNull(mismatch(
            // tslint:disable-next-line no-magic-numbers
            [true, null, 22, 'str'],
            ['boolean', 'object', 'number', 'string']
        ));
        assert.isNull(mismatch([1, 2, null, false], []));
        assert.isNull(mismatch([], []));
        assert.isNull(mismatch([], ['string']));
        assert.isNull(mismatch({}, {}));
        assert.isNull(mismatch(
            42, new Set<TypeDescription>(
                [{obj: 'number'}, 'string', 'number', ['boolean']]
            )
        ));
        assert.isNull(mismatch(23, suspect => suspect === 23));
        assert.isNull(mismatch('str', suspect => suspect === 'str'));
        assert.isNull(mismatch({
            prop: 'Ruslan',
            enum: 43
        }, {
            prop: 'string',
            enum: suspect => typeof suspect === 'number' && [58, 4, 43].includes(suspect)
        }));
    });

    it('should return (.matched === false) with the proper path', () => {
        assert.deepStrictEqual(mismatch(true, 'number'), new MismatchInfo({
            actualValue: true,
            expectedTd: 'number',
            path: []
        }));
        const obj = { someObj: true };
        assert.deepStrictEqual(mismatch(obj, []), new MismatchInfo({
            actualValue: obj,
            expectedTd: [],
            path: []
        }));
        assert.deepStrictEqual(mismatch(obj, [{objects: 'number'}]), new MismatchInfo({
            actualValue: obj,
            expectedTd:  [{ objects: 'number' }],
            path: []
        }));        
        const setTd = new Set<TypeDescription>(
            [{obj: 'number'}, 'string', 'number', ['boolean']]
        );
        assert.deepStrictEqual(mismatch(obj, setTd), new MismatchInfo({
                actualValue: obj,
                expectedTd: setTd,
                path: []
            }
        ));
        const nestedObj = { 
            someProp: {
                nested: {
                    moreNested: 22
                }
            }
        };
        assert.deepStrictEqual(mismatch(nestedObj, 
            { someProp: { nested: { moreNested: 'string' } } }), new MismatchInfo({
            actualValue: 22,
            expectedTd: 'string',
            path: ['someProp', 'nested', 'moreNested']
        }));

        const nestedObjWithArray = {
            nested: {
                nestedArray: [{obj: 22}, {obj: 32}, {obj: 56}, {obk: 43}]
            }
        };
        assert.deepStrictEqual(mismatch(nestedObjWithArray,
            { nested: { nestedArray: [{obj: 'number'}] } }), new MismatchInfo({
                actualValue: undefined,
                expectedTd:  'number',
                path: ['nested', 'nestedArray', 3, 'obj']
        }));
        assert.deepStrictEqual(
            mismatch(
                { id: 0 }, { id: isPositiveInteger }
            ),
            new MismatchInfo({ 
                actualValue: 0, 
                expectedTd: isPositiveInteger,
                path: ['id'] 
            })
        );
    });
});


describe('mismatch', () => {
    it(`should return (.matched === false) for excess properties`, () => {
        assert.deepStrictEqual(mismatch({
            prop: 1,
            ex: true
        },{
            prop: 'number'
        }),
        new MismatchInfo({
            actualValue: { prop: 1, ex: true },
            expectedTd: { prop: 'number' },
            path: []
        }));
    });

    it(`should return (.matched === true) if TD allows optional properties`, () => {
        assert.isNull(mismatch({ prop: 's' }, {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number')
        }));

        assert.isNull(mismatch({ prop: 's' }, {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number'),
            opt2: optional('string')
        }));

        assert.isNull(mismatch({
            prop: 's',
            opt: 23
        }, {
            prop: s => typeof s === 'string' && s === 's',
            opt: optional('number')
        }));
    });
});


describe('MatchInfo.pathString()', () => {
    function call(...path: PathArray) {
        return (new MismatchInfo({ path, actualValue: 0, expectedTd: 'string'}))
                .pathString();
    }

    it('should return string "root" if path is an empty array', () => {
        assert.strictEqual(call(), 'root');
    });

    it('should wrap empty string path into computed property', () => {
        assert.strictEqual(call('foo', '', '', 'bar'), `root.foo[''][''].bar`);
    });

    it('should return unwrapped path parts if they are valid JS identifiers', 
        () => {
        assert.strictEqual(call('foo'), 'root.foo');
        assert.strictEqual(call('foo', 'bar', 'baz'), 'root.foo.bar.baz');
        assert.strictEqual(call('$id', '_id2', '__', '$$'), `root.$id._id2.__.$$`);
    });

    it(`should return wrapped path parts into ['*'] for computed ivalid JS identifiers`,
        () => {
        assert.strictEqual(
            call('invalid space', '  ', ' 34'), 
            `root['invalid space']['  '][' 34']`
        );
        }
    );

    it(`should return numbered properties without cuotes as [number]`,
        () => {
        assert.strictEqual(
            call(23, 0, NaN, Infinity, -45), 
            `root[23][0][NaN][Infinity][-45]`
        );
        }
    );

    it(`should confirm the example from README.md`, () => {
        assert.strictEqual(mismatch(
            {
                foo: {
                    bar: {
                        'twenty two': [
                            { prop: 'str' }, 
                            { prop: -23 }
                        ]
                    }
                }
            },
            { foo: { bar: { 'twenty two': [ { prop: 'string' } ] } } },
            )!.pathString(),
            `root.foo.bar['twenty two'][1].prop`
        );
    });
});

