const   gulp = require('gulp'),
        clean = require('gulp-clean'),
        babel = require('gulp-babel'),
        css = require('gulp-clean-css'),
        uglify = require('gulp-uglify'),
        concat = require('gulp-concat'),
        sourcemaps = require('gulp-sourcemaps');


gulp.task('_build', () => {
    gulp.src('src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015'],
            ignore: './**/*.wip.js'
        }).on('error', (err) => {
            console.log('Some shits appends ... ', err.message);
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'));
    
    return gulp.src('src/**/*.css')
        .pipe(sourcemaps.init())
        .pipe(css())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'));
});

gulp.task('release', ['build'], () => {
    gulp.src(['node_modules/babel-polyfill/dist/polyfill.min.js', 'dist/**/*.js'])
        .pipe(concat('build.js'))
        .pipe(gulp.dest('bin'))
        .pipe(uglify())
        .pipe(gulp.dest('bin'));


    return gulp.src('dist/**/*.css')
        .pipe(concat('build.css'))
        .pipe(gulp.dest('bin'));
});

gulp.task('clean', () => {
    gulp.src(['bin/*', 'dist/*', 'temp'], {read: false})
        .pipe(clean());
});

gulp.task('watch', ['build'], () => {
    gulp.watch('src/**/*.js', ['_build']);
});

gulp.task('default', ['watch']);
gulp.task('build', ['clean', '_build']);