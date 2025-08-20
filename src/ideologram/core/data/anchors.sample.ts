import { BookAnchor } from '../types.js';

export const SAMPLE_ANCHORS: BookAnchor[] = [
  {
    id: 'OLID:hayek_serfdom',
    title: 'The Road to Serfdom',
    author: 'F. A. Hayek',
    isbn: '9780226320619',
    axes: {
      econ_lr: 0.7,
      cult_libcon: 0.2,
      auth_lib: 0.6,
      global_local: 0.1,
      tech_prog: 0.2,
      epistemic_rat: 0.3,
    },
    weight: 0.8,
    tags: ['classical-liberalism']
  },
  {
    id: 'OLID:marx_manifesto',
    title: 'The Communist Manifesto',
    author: 'Karl Marx; Friedrich Engels',
    isbn: '9780140447576',
    axes: {
      econ_lr: -0.9,
      cult_libcon: -0.4,
      auth_lib: -0.2,
      global_local: -0.2,
      tech_prog: -0.5,
      epistemic_rat: -0.1,
    },
    weight: 0.9,
    tags: ['anti-capitalist']
  },
  {
    id: 'OLID:rand_atlas',
    title: 'Atlas Shrugged',
    author: 'Ayn Rand',
    isbn: '9780451191144',
    axes: {
      econ_lr: 0.9,
      cult_libcon: 0.3,
      auth_lib: 0.8,
      global_local: 0.1,
      tech_prog: 0.4,
      epistemic_rat: 0.5,
    },
    weight: 0.7,
    tags: ['objectivism', 'fiction']
  },
  {
    id: 'OLID:pinker_better_angels',
    title: 'The Better Angels of Our Nature',
    author: 'Steven Pinker',
    isbn: '9780143122012',
    axes: {
      econ_lr: 0.2,
      cult_libcon: -0.2,
      auth_lib: 0.3,
      global_local: -0.3,
      tech_prog: 0.6,
      epistemic_rat: 0.5,
    },
    weight: 0.6,
    tags: ['optimism']
  }
];
