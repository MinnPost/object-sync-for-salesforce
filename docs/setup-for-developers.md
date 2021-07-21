# Setup for developers

If you intend to contribute code for this plugin, or if you have installed it from GitHub, follow these additional guidelines for setup. If you haven't already, read the [initial setup instructions](./initial-setup.md).

## Additional prerequisites

Even if you are developing in a local development environment, you will need to run an SSL certificate to connect your website with Salesforce. If you develop on a Mac, one method you can use is [Laravel Valet](https://laravel.com/docs/8.x/valet).

1. [Composer](https://getcomposer.org). You'll need to have the composer executable in your path, or be able to call it in another way (one recommended way of doing this is [Homebrew](http://brew.sh/)).
2. If you intend to contribute interface work, for example on the admin settings design, or translation work, to translate all or some of the plugin's text into another language, you will need Node.js and Gulp installed as well. You can use [this guide](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) to set it up, and this plugin already includes a `package.json` and `Gulpfile.js`.

*Note*: if you would like to contribute translation work, as defined in #6, but are uncomfortable using Node and Gulp, you can always submit your changes as [one or more issues](https://github.com/minnpost/object-sync-for-salesforce/issues) instead. Please indicate what the text you want to translate currently says, where in the plugin you can find it, what it should say in the additional language, and of course what language it is.

## Plugin installation

Developers may prefer to install this plugin from its GitHub repository:

1. Run `cd` to get into the `wp-content/plugins` directory of a WordPress install.
2. Run `git clone https://github.com/MinnPost/object-sync-for-salesforce.git`
3. Run `cd object-sync-for-salesforce`
4. Run `composer install`
5. This will take a little while as Composer installs third-party libraries the plugin needs. You can then activate the plugin as you would a normal WordPress plugin. To install the libraries that the plugin runs in production only, you can use `composer install --no-dev --prefer-dist;` instead.
6. If you are doing interface or translation work, as defined above, run `npm install` to install the Gulp plugins. Run `gulp` when you make changes to Sass, JavaScript, or when you create new translations.
7. If you intent to contribute PHP work, you may want to install [phpDocumentor](https://phpdoc.org/) to generate code documentation. You can use [this link](https://phpdoc.org) to set it up. At this time, it is not included with this plugin. We recommend that you use  `phpDocumentor.phar` and run it in the plugin's root directory when you make relevant changes. For example, if you have this file installed in your `~/Sites` directory, you would run `php ~/Sites/phpDocumentor.phar`. You can check these changes in to the Git repository.
