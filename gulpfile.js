'use strict';

const fs = require('fs');
const _ = require('lodash');
const args = require('yargs').argv;
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpDebug = require('gulp-debug');
const gulpJshint = require('gulp-jshint');
const gulpTodo = require('gulp-todo');
const gulpJasmine = require('gulp-jasmine');
const gulpUtil = require('gulp-util');
const gulpConcat = require('gulp-concat');
const gulpJsdoc2md = require('gulp-jsdoc-to-markdown');

const isDebug = !!args.debug;
const isVerbose = !!args.verbose;
const isStackTrace = !!args.stackTrace;
const cliSrc = args.files;

const config = {
  paths: {
    scripts: ['./**/*.js', '!./**/*.spec.js', '!./node_modules/**/*.js'],
    specs: ['./**/*.spec.js', '!./node_modules/**/*.js'],
    all: ['./**/*.js', '!./node_modules/**/*.js']
  }
};

gulp.task('default', function () {
  // place code for your default task here
});

gulp.task('lint', function () {
  // Check for `test` to ensure both the specified specs
  // and corresponding scripts are linted
  const glob = _.isEmpty(cliSrc) ?
    config.paths.all :
    cliSrc.replace(/\.spec\.js$/, '?(.spec).js');

  return lint(glob);
});

gulp.task('lint:scripts', function () {
  return lint(config.paths.scripts);
});

gulp.task('lint:spec', function () {
  return lint(config.paths.specs);
});

gulp.task('test', ['lint'], function () {
  return testRunner(cliSrc || config.paths.specs);
});

gulp.task('watch', ['test'], function () {
  // Check to ensure both the specified specs
  // and corresponding scripts are watched
  const glob = _.isEmpty(cliSrc) ?
    config.paths.all :
    cliSrc.replace(/\.spec\.js$/, '?(.spec).js');

  return gulp.watch(glob, ['test']);
});

gulp.task('todo', function () {
  return gulp.src(config.paths.all)
    .pipe(gulpTodo({
      //fileName: 'todo.md',
      verbose: isVerbose,
      //newLine: gulpUtil.linefeed,
      /*
      transformComment: function (file, line, text) {
          return ['| ' + file + ' | ' + line + ' | ' + text];
      },
      transformHeader: function (kind) {
          return ['### ' + kind + 's',
              '| Filename | line # | todo',
              '|:------|:------:|:------'
          ];
      }
      */
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('docs', function() {
  return gulp.src(config.paths.all)
    .pipe(gulpConcat('README.md'))
    .pipe(gulpJsdoc2md({template: fs.readFileSync('./readme.hbs', 'utf8')}))
    .on('error', function(err){
      gulpUtil.log('jsdoc2md failed:', err.message);
    })
    .pipe(gulp.dest('.'));
});

function testRunner(src) {
  if (arguments.length > 1) {
    src = [].concat([].slice.call(arguments));
  }

  return gulp.src(src)
    .pipe(gulpIf(isDebug, gulpDebug({title: 'test:'})))
    .pipe(gulpJasmine({
      verbose: isVerbose,
      includeStackTrace: isStackTrace
    }));
}

function lint(src) {
  return gulp.src(src)
    .pipe(gulpIf(isDebug, gulpDebug({title: 'lint:'})))
    .pipe(gulpJshint())
    .pipe(gulpJshint.reporter('default', {verbose: isVerbose}))
    .pipe(gulpJshint.reporter('fail'));
}
