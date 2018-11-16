#!/usr/bin/env bash
RELEASE_DIR=release;
SVN_PATH=$RELEASE_DIR/svn;
SVN_REPO="https://plugins.svn.wordpress.org/object-sync-for-salesforce/";
BLACKLIST=(
.\*
assets/js/src/\*
assets/sass/\*
bin/*
composer.lock
composer.json
Gulpfile.js
node_modules/\*
package-lock.json
package.json
phpdoc.dist.xml
phpunit.xml
release.sh
release/\*
test/\*
tests/\*
_sourcefiles/\*
./\*\*/.\*
);

function ensure_release_dir() {
	local release_dir="$1";
	if [[ ! -d $release_dir ]]
	then
		echo "Creating $release_dir directory";
		mkdir -p $release_dir;
	fi
}

function is_master_branch() {
	local remotes=`git ls-remote --quiet`;
	local current=`get_current_git_commit`;
	local is_master=`echo "$remotes" | grep "refs/heads/master" | grep $current | awk '{print $2;}'`;
	echo "$is_master";
}

function is_git_tag() {
	local remotes=`git ls-remote --quiet`;
	local current=`get_current_git_commit`;
	local is_tag=`echo "$remotes" | grep "refs/tags" | grep $current | awk '{print $2;}' | sed -e 's/^refs\/tags\///;s/\^{}$//'`;
	echo "$is_tag";
}

function get_current_git_commit() {
	echo `git rev-parse HEAD`;
}

function check_repo_state() {
	#
	# Check the state of this git repo. If no tag is checked out
	# and we're not on the master branch, bail.
	#
	local is_master=`is_master_branch`;
	local is_tag=`is_git_tag`;

	if [[ "$is_master" == "" && "$is_tag" == "" ]]
	then
		echo "Bad release state for git repo!";
		echo "Make sure you've checked out a tag or the master branch before releasing.";
		exit 1;
	else
		echo "Repository is ready for deployment...";
	fi
}

function confirm_deployment() {
	# make sure we know what we're doing
	local is_master=`is_master_branch`;
	local is_tag=`is_git_tag`;
	local which_text="[master] and [$is_tag]";

	if [[ $is_master == "" ]]
	then
		which_text="[$is_tag]";
	fi

	if [[ $is_tag == "" ]]
	then
		 which_text="[master]";
	fi

	read -p "Really release plugin from $which_text? [y/N] " -r;
	if [[ ! $REPLY =~ ^[Yy]$ ]]
	then
		echo "No changes made. Exiting...";
		exit 0;
	fi
}

function init_update_svn_repo() {
	local svn_path="$1";
	local svn_repo="$2";

	if [[ "$svn_path" == "" || "$svn_repo" == "" ]]
	then
		echo "The svn_path and svn_repo arguments are required.";
		exit 1;
	fi

	# init and update svn repo
	if [[ ! -d $svn_path ]]
	then
		echo " - checking out svn repo";
		OUT=`mkdir -p $svn_path && svn checkout $svn_repo $svn_path`
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi
	else
		echo " - updating svn repo";
		OUT=`cd $svn_path && svn update`;
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi
	fi
}

function create_release_zip() {
	# Build a release zip file
	echo "Creating release/wp-release.zip";

	OUT=`rm -f release/wp-release.zip`;
	OUT=`zip -x "${BLACKLIST[@]}" -q -r release/wp-release.zip .`;

	if [[ $? -ne 0 ]]
	then
		echo "$OUT";
		exit 1;
	fi
}

function install_update_dependencies() {
	echo "Checking for third-party/vendor dependencies...";
	# If composer.json exists, run composer install
	if [[ -f composer.json ]]
	then
		echo " - installing composer dependencies";
		composer install --no-dev --prefer-dist;
	fi

	# If package.json exists, run npm install
	if [[ -f package.json ]]
	then
		echo " - installing npm dependencies";
		npm install;
	fi

	# If bower.json exists, run bower install
	if [[ -f bower.json ]]
	then
		echo " - installing bower dependencies";
		bower install;
	fi
}

function write_trunk() {
	local svn_path="$1";
	local is_master=`is_master_branch`;

	if [[ $is_master != "" ]]
	then
		trunk_path=$svn_path/trunk;
		echo "Writing to $trunk_path";

		# overwrite with unzip
		OUT=`rm -rf $trunk_path && unzip -o release/wp-release.zip -d $trunk_path`;
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi;

		# stage all changes (adds and removes)
		OUT=`cd $trunk_path && svn st | grep '^\?' | awk '{print \$2}' | xargs svn add` # add all
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi

		OUT=`cd $trunk_path && svn st | grep '^\!' | awk '{print \$2}' | xargs svn rm` # remove all
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi

		# make sure something has changed besides the autoloader hashes
		CHANGES=`cd $trunk_path && svn st | grep -v 'autoload\(_real\)\?\.php'`
		if [[ $CHANGES == "" ]]
		then
			echo "There are no changes to commit for trunk.";
			OUT=`cd $trunk_path && svn revert --recursive .`;
			if [[ $? -ne 0 ]]
			then
				echo "$OUT";
				exit 1;
			fi
		else
			echo "Committing $trunk_path (slow) ...";
			CURRENT=`get_current_git_commit`;
			OUT=`cd $trunk_path && svn commit -m "update trunk to git $CURRENT"`;
			if [[ $? -ne 0 ]]
			then
				echo "$OUT";
				exit 1;
			fi
		fi
	fi
}

function write_tag() {
	local svn_path="$1";
	local is_tag=`is_git_tag`;

	if [[ $is_tag != "" ]]
	then
		WP_TAG=`echo $is_tag | sed -e 's/^v//'`;
		TAG_PATH=$svn_path/tags/$WP_TAG;
		echo "Writing to $TAG_PATH";

		# overwrite with unzip
		OUT=`rm -rf $TAG_PATH && unzip -o release/wp-release.zip -d $TAG_PATH`;
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi

		# TODO: set version numbers and/or ensure version numbers in plugin files are correct

		# stage all changes (adds and removes)
		OUT=`cd $svn_path/tags && svn st | grep '^\?' | awk '{print \$2}' | xargs svn add`; # add all
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi
		OUT=`cd $svn_path/tags && svn st | grep '^\!' | awk '{print \$2}' | xargs svn rm`; # remove all
		if [[ $? -ne 0 ]]
		then
			echo "$OUT";
			exit 1;
		fi

		# make sure something has changed besides the autoloader hashes
		CHANGES=`cd $svn_path/tags && svn st | grep -v 'autoload\(_real\)\?\.php'`;
		if [[ $CHANGES == "" ]]
		then
			echo "There are no changes to commit for $TAG_PATH";
			OUT=`cd $svn_path/tags && svn revert --recursive .`;
			if [[ $? -ne 0 ]]
			then
				echo "$OUT";
				exit 1;
			fi
		else
			echo "Committing $TAG_PATH (slow) ...";
			CURRENT=`get_current_git_commit`;
			OUT=`cd $svn_path/tags && svn commit -m "update $WP_TAG to git $CURRENT"`;
			if [[ $? -ne 0 ]]
			then
				echo "$OUT";
				exit 1;
			fi
		fi
	fi
}

function help_text() {
	echo "Usage: ./release.sh [--dry_run, --help]";
	echo "";
	echo "--dry_run: Create the release directory and release zip,
					 but bon't actually commit to the SVN repository."
	echo "";
	echo "--help:    Display this help screen and exit.";
	echo "";
	exit 0;
}

# Parse args
if [[ $@ =~ "help" || $@ =~ "--help" ]]
then
	help_text;
fi

if [[ $@ =~ "dry_run" || $@ =~ "--dry_run" ]]
then
	dry_run=1;
else
	dry_run=0;
fi

# Start the release process
ensure_release_dir "$RELEASE_DIR";
check_repo_state;
confirm_deployment;

if [[ $dry_run == 0 ]]
then
	init_update_svn_repo "$SVN_PATH" "$SVN_REPO";
fi

install_update_dependencies;
create_release_zip;

if [[ $dry_run == 0 ]]
then
	write_trunk "$SVN_PATH";
	write_tag "$SVN_PATH";
fi

echo "Release process finished."
