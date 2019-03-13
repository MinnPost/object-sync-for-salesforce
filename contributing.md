# Contributing

We welcome contributions and suggestions to help us improve this project. You can always [create issues](https://github.com/minnpost/object-sync-for-salesforce/issues) on this repository to suggest changes or improvements. We actively add our own issues to the list, and comment on their progress. Further, you can always email us at [tech@minnpost.com](mailto:tech@minnpost.com).

## Setup

In our [initial setup documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md), we detail how to install the plugin and the developer tools it requires for various tasks. Follow these developer instructions. If you are familiar with the command line already, here are the various requirements:

### For general PHP development

Most developers will want to install [Composer](https://getcomposer.org). You'll need to have the composer executable in your path, or be able to call it in another way (one recommended way of doing this is [Homebrew](http://brew.sh/)).

### For interface and translation work

If you intend to contribute interface work, for example on the admin settings design, or translation work, to translate all or some of the plugin's text into another language, you will need Node.js and Gulp installed as well. You can use [this guide](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) to set it up, and this plugin already includes a `package.json` and `Gulpfile.js`.

You'll need to run `gulp` in the plugin's main directory if you make changes to Sass, JavaScript, or when you create new translations.

*Note*: if you would like to contribute translation work but are uncomfortable using Node and Gulp in this way, you can always submit your changes as [one or more issues](https://github.com/minnpost/object-sync-for-salesforce/issues) instead. Please indicate what the text you want to translate currently says, where in the plugin you can find it, what it should say in the additional language, and of course what language it is.

### For documentation

If your contribution is PHP work, it may be relevant to the [code documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/code/index.html). In that case, you may want to install [phpDocumentor](https://phpdoc.org/) to generate this documentation. You can use [this link](https://phpdoc.org) to set it up.

Run `phpDocumentor.phar` (or however you call the file) in the plugin's root directory when you make relevant changes. For example, if you have this file installed in your `~/Sites` directory, you would run `php ~/Sites/phpDocumentor.phar`. You can check these changes in to the Git repository.

## Standards

- Use [WordPress Coding Standards](https://make.wordpress.org/core/handbook/best-practices/coding-standards/) for CSS, HTML, JavaScript, and PHP, whenever possible. If you see places we've missed these, feel free to fix as long as nothing breaks. When pull requests are submitted, they'll be automatically checked against the current [Travis CI](https://travis-ci.org/MinnPost/object-sync-for-salesforce) and [Code Climate](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce/) configurations, and you'll see those results after they finish running.
- Use [markdown syntax](http://daringfireball.net/projects/markdown/syntax) for all text documents.
- We'd appreciate tests, either for new or existing functionality, but as we don't currently have any this is certainly not a requirement.

## Workflow:

1. [Fork this repository](https://help.github.com/articles/fork-a-repo)
2. Create a branch (`git checkout -b my-branch`)
3. Stage and commit your changes (`git commit -am 'description of my changes'`)
4. Push the changes to your fork (`git push origin my-branch`)
5. [Submit a pull request to the parent repository](https://help.github.com/articles/creating-a-pull-request).
6. Pull requests should be assigned to:
    - [@jonathanstegall](https://github.com/jonathanstegall) (primary)
