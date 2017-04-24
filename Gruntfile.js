module.exports = function(grunt) {

  /**
   * Initialize grunt
   */
  grunt.initConfig({

    /**
     * Read package.json
     */
    pkg: grunt.file.readJSON('package.json'),


    /**
     * Set banner
     */
    banner: '/**\n' +
    '<%= pkg.title %> - <%= pkg.version %>\n' +
    '<%= pkg.homepage %>\n' +
    'Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n' +
    'License: <%= pkg.license %>\n' +
    '*/\n',


    /**
     * Set directory paths
     */
    dir: {
      js: 'assets/js',
      css: 'assets/css',
      sass: 'assets/sass',
      img: 'assets/img'
    },


    /**
     * Sass compiling
     * @github.com/gruntjs/grunt-contrib-sass
     */
    sass: {

      dist: {
        options: {
          style: 'expanded'
        },

        files: [{
            expand: true,        // Enable dynamic expansion.
            cwd: '<%= dir.sass %>/',  // Src matches are relative to this path.
            src: ['*.scss'],     // Actual pattern(s) to match.
            dest: '<%= dir.css %>/',  // Destination path prefix.
            ext: '.css',         // Dest filepaths will have this extension.
        }]

      }
      
    },


    /**
     * Compress .jpg/.png
     * @github.com/gruntjs/grunt-contrib-imagemin
     */
    imagemin: {
      dist: {
        options: {
            optimizationLevel: 3,
            progressive: true
        },
        files: [{
          expand: true, // Enable dynamic expansion.
          cwd: '<%= dir.img %>/', // Src matches are relative to this path.
          src: '{,*/}*.{png,jpg,jpeg}', // Actual pattern(s) to match.
          dest: '<%= dir.img %>/', // Destination path prefix.
        }],
      }
    },


    /**
     * JSHint
     * @github.com/gruntjs/grunt-contrib-jshint
     */
    jshint: {
      gruntfile: 'Gruntfile.js',
      files: ['<%= dir.js %>/src/**/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },


    /**
     * Concatenate
     * @github.com/gruntjs/grunt-contrib-concat
     */
    concat: {
      options: {
        stripBanners: true,
        //banner: '<%= banner %>',
        separator: ''
      },
      js: {
        src: [
            '<%= dir.js %>/src/admin.js'
        ],
        dest: '<%= dir.js %>/object-sync-for-salesforce-admin.js'
      },
    },

    autoprefixer: {
      dev: {
            options: {
              browsers: ['last 2 versions']
            },
            src: '<%= dir.css %>/object-sync-for-salesforce-admin.css',
            dest: '<%= dir.css %>/object-sync-for-salesforce-admin.css'
        },
        dist: {
            options: {
              browsers: ['last 2 versions']
            },
            src: '<%= dir.css %>/object-sync-for-salesforce-admin.css',
            dest: '<%= dir.css %>/object-sync-for-salesforce-admin.css'
        }
    },

    cssmin: {
      target: {
        files: [{
          expand: true,
          cwd: '<%= dir.css %>',
          src: ['*.css', '!*.min.css'],
          dest: '<%= dir.css %>',
          ext: '.min.css'
        }]
      }
    },

    /**
     * Minify
     * @github.com/gruntjs/grunt-contrib-uglify
     */
    uglify: {

      // Uglify options

      // Minify js files in js/src/
      dist: {
        src: ['<%= concat.js.dest %>'],
        dest: '<%= dir.js %>/object-sync-for-salesforce-admin.min.js'
      },
    }

  });


  /**
   * Default Task
   * run `grunt`
   */
  grunt.registerTask('default', [
    //'jshint',           // JShint
    'concat:js',        // Concatenate main JS files
    'uglify',           // Minifiy concatenated JS file
    'sass:dist',      // Compile Sass
    'autoprefixer:dev', // add prefixes to css
    'cssmin',           // minify CSS files
  ]);


  /**
   * Production tast, use for deploying
   * run `grunt production`
   */
  grunt.registerTask('production', [
    //'jshint',           // JShint
    'concat:js',        // Concatenate main JS files
    'uglify',           // Minifiy concatenated JS file
    'sass:dist',      // Compile Sass
    'imagemin',         // Compress jpg/jpeg + png files
    'autoprefixer:dist',// add prefixes to css,
    'cssmin',           // minify CSS files
  ]);


  /**
   * Image Tasks
   * run `grunt images`
   */
  grunt.registerTask('images', [
    'imagemin',         // Compress jpg/jpeg + png files
  ]);


  /**
   * Load the plugins specified in `package.json`
   */
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-autoprefixer');
  //grunt.loadNpmTasks('grunt-contrib-watch');

};