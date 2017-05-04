# Contributing

We welcome contributions and suggestions to help us improve this project.

### Workflow:

1. [Fork this repo](https://help.github.com/articles/fork-a-repo)
2. Create a branch (git checkout -b my-branch)
3. Stage and commit your changes (git commit -am 'description of my changes')
4. Push the changes to your fork (git push origin my-branch)
5. [Submit a pull request to the parent repo](https://help.github.com/articles/creating-a-pull-request).
6. Pull requests should be assigned to:
    - [@jonathanstegall](http://github.com/jonathanstegall) (primary)

If your changes are relevant to the [code documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/code/index.html), run `apigen generate` in the plugin's root directory to recreate it. You'll need to have [apigen](http://www.apigen.org/) installed and in your path to do this.

Additionally, you can [create issues](https://github.com/minnpost/object-sync-for-salesforce/issues) on this repo to suggest changes or improvements. We actively add our own issues to the list, and comment on their progress.

And you can always email us: [tech@minnpost.com](mailto:tech@minnpost.com).

### Standards

- Use [WordPress Coding Standards](https://make.wordpress.org/core/handbook/best-practices/coding-standards/) for CSS, HTML, JavaScript, and PHP, whenever possible. If you see places we've missed these, feel free to fix as long as nothing breaks.
- Use [markdown syntax](http://daringfireball.net/projects/markdown/syntax) for all text documents.
- We'd appreciate tests, either for new or existing functionality, but as we don't currently have any this is certainly not a requirement.