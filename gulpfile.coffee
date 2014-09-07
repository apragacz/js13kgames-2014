gulp = require('gulp')
uglify = require('gulp-uglify')
jshint = require("gulp-jshint")
concat = require('gulp-concat')
minifyHTML = require('gulp-minify-html')
zip = require('gulp-zip');

gulp.task 'minify-js', ->
    gulp.src('app/js/*.js')
        .pipe(uglify())
        .pipe(concat('js/app.js'))
        .pipe(gulp.dest('build'))

gulp.task 'minify-html', ->
    gulp.src('app/index.html')
        .pipe(minifyHTML())
        .pipe(gulp.dest('build'))

gulp.task 'zip', ['minify-js', 'minify-html'], ->
    gulp.src('build/**')
        .pipe(zip('game.zip'))
        .pipe(gulp.dest('.'));


gulp.task 'default', ['zip']


gulp.task 'jshint', ->
    return gulp.src('app/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
