const env = require('gulp-env'),
      clean = require('gulp-clean'),
      gulp = require('gulp'),
      babel = require('gulp-babel'),
      concat = require('gulp-concat'),
      uglify = require('gulp-uglify'),
      cssnano = require('gulp-cssnano'),
      postcss = require('gulp-postcss'),
      autoprefixer = require('autoprefixer'),
      postcssPresetEnv = require('postcss-preset-env'),
      assets  = require('postcss-assets'),
      short = require('postcss-short'),
      nested = require('postcss-nested'),
      imagemin = require('gulp-imagemin'),
      glob = require('glob'),
      handlebars = require('gulp-compile-handlebars'),
      rename = require('gulp-rename'),
      templateContext = require('./src/data.json'),
      eslint = require('gulp-eslint'),
      stylelint = require('stylelint'),
      reporter = require('postcss-reporter'),
      rulesScripts = require('./eslintrc.json'),
      rulesStyles = require('./stylelintrc.json'),
      gulpif = require('gulp-if'),
      sourcemaps = require('gulp-sourcemaps'),
      browserSync = require('browser-sync').create(),
      paths = {
          src: {
              dir: 'src',
              scripts: 'src/**/*.js',
              styles: 'src/**/*.css'
          },
          build: {
              dir: 'build/',
              scripts: 'build/scripts',
              styles: 'build/styles'
          },
          buildNames: {
              scripts: 'scripts.min.js',
              styles: 'styles.min.css'
          },
          templates: 'src/templates/**/*.hbs',
          lint: {
              scripts: ['**/*.js', '!node_modules/**/*', '!build/**/*'],
              styles: ['**/*.css', '!node_modules/**/*', '!build/**/*']
          }
      };

env({
    file: '.env',
    type: 'ini'
});

gulp.task('clean', function () {
    gulp.src('build', {read: false})
        .pipe(clean());
});

gulp.task('compile', () => {
    glob(paths.templates, (err, files) => {
        if (!err) {
            const options = {
                ignorePartials: true,
                batch: files.map(item => item.slice(0, item.lastIndexOf('/'))),
                helpers: {
                    capitals: str => str.toUpperCase(),
                    sum: (a, b) => a + b
                }
            };

            gulp.src('src/templates/index.hbs')
                .pipe(handlebars(templateContext, options))
                .pipe(rename('index.html'))
                .pipe(gulp.dest(paths.build.dir));
        }
    });
});

gulp.task('build-js', () => {
    gulp.src(paths.src.scripts)
        .pipe(sourcemaps.init())
            .pipe(concat(paths.buildNames.scripts))
            .pipe(babel({
                presets: ['@babel/env']
            }))
            .pipe(gulpif(process.env.NODE_ENV === 'production', uglify()))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(paths.build.scripts));
});

gulp.task('build-css', () => {
    const plugins = [
        autoprefixer({
            browsers: ['last 1 version']
        }),
        postcssPresetEnv,
        assets({
            loadPaths: ['build/images/'],
            relativeTo: 'build/styles/'
        }),
        short,
        nested({
            preserveEmpty: true
        })
    ];

    gulp.src(paths.src.styles)
        .pipe(sourcemaps.init())
            .pipe(postcss(plugins))
            .pipe(concat(paths.buildNames.styles))
            .pipe(gulpif(process.env.NODE_ENV === 'production', cssnano()))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(paths.build.styles));
});

gulp.task('browser-sync', () => {
    browserSync.init({
        server: {
            baseDir: 'build/'
        }
    });
    gulp.watch(paths.src.scripts, ['js-watch']);
    gulp.watch(paths.src.styles, ['css-watch']);
});

gulp.task('lint', ['eslint', 'stylelint']);

gulp.task('eslint', () => {
    gulp.src(paths.lint.scripts)
        .pipe(eslint(rulesScripts))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('stylelint', () => {
    gulp.src(paths.lint.styles)
        .pipe(postcss([
            stylelint(rulesStyles),
            reporter({
                clearReportedMessages: false,
                throwError: true
            })
        ]));
});

gulp.task('fonts', () => {
    gulp.src('./src/fonts/**/*')
        .pipe(gulp.dest(`${paths.build.dir}/fonts`));
});

gulp.task('image', () => {
    gulp.src('src/images/**/*')
        .pipe(imagemin())
        .pipe(gulp.dest(`${paths.build.dir}/images`));
});

gulp.task('watch', () => {
    gulp.watch(paths.handlebars, ['compile']);
    gulp.watch(paths.src.styles, ['build-css']);
    gulp.watch(paths.src.scripts, ['build-js']);
    gulp.watch('src/data.json')
        .on('change', browserSync.reload);
    gulp.watch(`${paths.buildDir}/**/*`)
        .on('change', browserSync.reload);
});

gulp.task('build', ['build-js', 'build-css', 'compile', 'fonts', 'image']);

gulp.task('clean-build', ['clean']);
gulp.task('prod', ['build']);
gulp.task('dev', ['build', 'browser-sync']);
gulp.task('default', ['dev']);
