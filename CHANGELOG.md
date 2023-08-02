# Changelog

## [1.9.1](https://github.com/node-modules/compressing/compare/v1.9.0...v1.9.1) (2023-08-02)


### Bug Fixes

* Use '/' path separator on Windows for tar archives ([#24](https://github.com/node-modules/compressing/issues/24)) ([3aa065b](https://github.com/node-modules/compressing/commit/3aa065b755c481a7a3f92b6184cd8bfd7b776a09))

## [1.9.0](https://github.com/node-modules/compressing/compare/v1.8.0...v1.9.0) (2023-03-26)


### Features

* add decompress alias to uncompress ([#90](https://github.com/node-modules/compressing/issues/90)) ([290b7b3](https://github.com/node-modules/compressing/commit/290b7b3c864d8901550239e066ec753de4bb91ba))

## [1.8.0](https://github.com/node-modules/compressing/compare/v1.7.0...v1.8.0) (2023-02-24)


### Features

* use @eggjs/yauzl to close Buffer() is deprecated message ([#86](https://github.com/node-modules/compressing/issues/86)) ([3a0a5f5](https://github.com/node-modules/compressing/commit/3a0a5f5d9b1cc8e3bc33735b8cd511ecdf2ddf70))

## [1.7.0](https://github.com/node-modules/compressing/compare/v1.6.3...v1.7.0) (2023-01-12)


### Features

* uncompress support overwrite file mode ([#81](https://github.com/node-modules/compressing/issues/81)) ([53f6e0d](https://github.com/node-modules/compressing/commit/53f6e0d3bd190b78a45904d7897bfa08f397aac2))

## [1.6.3](https://github.com/node-modules/compressing/compare/v1.6.2...v1.6.3) (2022-12-22)


### Bug Fixes

* throw error when source is not exists ([#78](https://github.com/node-modules/compressing/issues/78)) ([7785c72](https://github.com/node-modules/compressing/commit/7785c728d8f62b55fcce29961dc1edc54711d266))

---

1.6.2 / 2022-07-11
==================

**fixes**
  * [[`96226d3`](http://github.com/node-modules/compressing/commit/96226d363c7c8fa9ef1a8098af646de19e729ce7)] - fix: add `suppressSizeWarning` to types and typo fix (#72) (Zeeko <<zeeko@zeeko.dev>>)

1.6.1 / 2022-07-11
==================

**fixes**
  * [[`ba49232`](http://github.com/node-modules/compressing/commit/ba49232780a57c9a3800642d7d39ae1dcdfc9409)] - fix(types): onEntry stream type should ReadStream (#73) (Songhn <<songhn233@gmail.com>>)

**others**
  * [[`054d4a4`](http://github.com/node-modules/compressing/commit/054d4a41ae4ca5d7b9b83e7298e32cc1d62d7ef4)] - 🤖 TEST: Use GitHub Action (#69) (fengmk2 <<fengmk2@gmail.com>>)

1.6.0 / 2022-06-13
==================

**features**
  * [[`bd8ef44`](http://github.com/node-modules/compressing/commit/bd8ef44ade2f4b93d41ff2f78d6f17902d965798)] - feat: unzip should keep file mode (#68) (Artin <<lengthmin@gmail.com>>)

**others**
  * [[`592e518`](http://github.com/node-modules/compressing/commit/592e5180dfbdbc6cb1becd1baf6a007ce7b7cd39)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)

1.5.1 / 2020-05-11
==================

**fixes**
  * [[`f516814`](http://github.com/node-modules/compressing/commit/f51681490aeea44a7b27ec0c09d3fb3d0385c5c0)] - fix: index.d.ts streamHeader.name wrong declearing (#46) (shadyzoz <<ShadyZOZ@users.noreply.github.com>>)

1.5.0 / 2019-12-04
==================

**features**
  * [[`15c29e9`](http://github.com/node-modules/compressing/commit/15c29e9893880d2c19c343d133edb50f0c55c713)] - feat: zip format support custom fileName encoding (#36) (fengmk2 <<fengmk2@gmail.com>>)

**fixes**
  * [[`7d605fe`](http://github.com/node-modules/compressing/commit/7d605fe01a88bc6aab9a2b06a8725545f591bab9)] - fix: typescript error(#29) (Ruanyq <<yiqiang0930@163.com>>)

**others**
  * [[`4808fb8`](http://github.com/node-modules/compressing/commit/4808fb8e1d6cbbb31c0e82c359ec04eccb0c1eaf)] - test: add node 11 (#20) (fengmk2 <<fengmk2@gmail.com>>)

1.4.0 / 2018-11-30
==================

**others**
  * [[`1f352c8`](http://github.com/node-modules/compressing/commit/1f352c88028acf27c1881fd45d555094cb279c44)] - docs: add index.d.ts and test case (#17) (DiamondYuan <<541832074@qq.com>>)

1.3.2 / 2018-11-21
==================

**fixes**
  * [[`3713a0b`](http://github.com/node-modules/compressing/commit/3713a0b8d5b03d61c111afbbd4b6226169afeb14)] - fix: handle error from yazl when file not exists (#19) (DiamondYuan <<541832074@qq.com>>)

1.3.1 / 2018-08-24
==================

**fixes**
  * [[`b802819`](http://github.com/node-modules/compressing/commit/b8028195dd6e7200ff47c8f43f695d24838e986b)] - fix: keep stat mode when compress tar or tgz (#11) (Haoliang Gao <<sakura9515@gmail.com>>)

1.3.0 / 2018-08-13
==================

**features**
  * [[`04feafa`](http://github.com/node-modules/compressing/commit/04feafa6a290d877044ed162ca4c7dcdc5e54e87)] - feat: support absolute path zip file (#10) (fengmk2 <<fengmk2@gmail.com>>)

1.2.4 / 2018-07-13
==================

  * chore: replace multipipe with pump (#9)

1.2.3 / 2017-07-27
==================

  * fix: should resolve when all fileWriteStream finished (#7)

1.2.2 / 2017-07-06
==================

  * fix: make file mode correct (#6)

1.2.1 / 2017-07-01
==================

  * test: fix test on Windows (#4)

1.2.0 / 2017-07-01
==================

  * feat: add strip option when uncompress zip

1.1.0 / 2017-02-14
==================

  * feat: uncompress (#2)

1.0.0 / 2016-12-24
==================

  * rename to compressing
  * feat: 1st implementation
  * init
