module.exports = function(grunt) {
    grunt.initConfig({
        sass: {
          dev: {
            options: {
              sourceMap: true,
              outputStyle: 'expanded',
              includePaths: ['node_modules/bootstrap-sass/assets/stylesheets']
            },
            files: {
              'css/styles.css': 'sass/styles.scss'
            }
          },
          dist: {
            options: {
              sourceMap: true,
              outputStyle: 'compressed',
              includePaths: ['node_modules/bootstrap-sass/assets/stylesheets']
            },
            files: {
              'css/styles.css': 'sass/styles.scss'
            }
          }
        },
        watch: {
            css: {
                files: 'sass/*.scss',
                tasks: ['sass', 'postcss:dist']
            },
            js:{
                files : 'js/main.js',
                tasks : ['concat']
            }
            // ,
            // js:{
            //   files: 'js/*.js',
            //   tasks: ['uglify']
            // }
        },
        imagemin : {
          dynamic : {
            files : [{
              optimizationLevel: 7,
              expand : true,
              cwd : 'images/',
              src : ['**/*.{png,jpg,gif,svg}'],
              dest : 'test/'
            }]
          }
        },
        postcss:{
            options:{
                map : true,
                processors: [
                    require('autoprefixer')({browsers:'last 2 versions'})
                ]
            },
            dist:{
                src: 'css/styles.css'
            }
        },
        concat: {
          dist: {
            src: [

              'js/vendor/jquery-3.1.1.min.js',
              'js/vendor/modernizr.js',
              'js/vendor/bootstrap.min.js',
              'js/vendor/underscore-min.js',
              'js/vendor/slick.min.js',
              'js/vendor/iscroll-5.2.0.min.js',
              'js/vendor/jquery.lazyload.js',
              'js/main.js'
            ],
            dest: 'js/build.js'
          }
        },
        uglify: {
          dist: {
            files: {
              'js/main.min.js': ['js/main.js']
            }
          },
          build:{
            files: {
              'js/build.min.js': ['js/build.js']
            }
          }
        }
    });

    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-postcss');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['sass:dev', 'watch']);    
    grunt.registerTask('images', ['imagemin']);
    grunt.registerTask('build', ['sass:dist', 'postcss:dist', 'concat', 'uglify:build']);
};