<?php
/**
 * Generate readme.txt from GitHub's README.md
 *
 * @author fumikito
 * @version 2.0.0
 * @see https://github.com/fumikito/wp-readme
 * @package Object_Sync_Salesforce
 */

// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_read_fwrite
// phpcs:disable WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_read_file_get_contents
// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_read_file_put_contents

/**
 * Find readme and return file path.
 *
 * @param string $target_dir what directory we're in.
 *
 * @return string
 */
function wp_readme_find( $target_dir = '.' ) {
	$target_dir = rtrim( $target_dir, DIRECTORY_SEPARATOR );
	if ( is_dir( $target_dir ) ) {
		foreach ( scandir( $target_dir ) as $file ) {
			if ( in_array( $file, array( 'readme.md', 'README.md' ), true ) ) {
				return $target_dir . DIRECTORY_SEPARATOR . $file;
			}
		}
	}
	return '';
}

/** Write onto the readme.txt file
 *
 * @param string $target_file the file that is being written.
 *
 * @return bool
 * @throws Exception Message that the txt did not save.
 */
function wp_readme_replace( $target_file ) {
	if ( ! file_exists( $target_file ) ) {
		throw new Exception( 'File not found.', 404 );
	}
	// Check if file is wriable.
	$target_dir = dirname( realpath( $target_file ) );
	if ( ! is_writable( $target_dir ) ) {
		throw new Exception( 'Target directory is not writable.', 403 );
	}
	$new_file = dirname( $target_file ) . DIRECTORY_SEPARATOR . strtolower( preg_replace( '/\.md$/u', '.txt', basename( $target_file ) ) );
	if ( file_exists( $new_file ) && ! is_writable( $new_file ) ) {
		throw new Exception( 'readme.txt already exists and is not writable.', 403 );
	}
	$string = file_get_contents( $target_file );
	$string = wp_readme_convert_string( $string );
	// Save file.
	if ( ! @ file_put_contents( $new_file, $string ) ) {
		throw new Exception( 'Failed to save readme.txt' );
	}
	return true;
}

/**
 * Convert readme string.
 *
 * @param string $string the readme text.
 *
 * @return string
 */
function wp_readme_convert_string( $string ) {
	// Control visibility.
	$string = wp_readme_visibility( $string );

	// Format code.
	$string = preg_replace( '/```([^\n`]*?)\n(.*?)\n```/us', '<pre>$2</pre>', $string );

	return $string;
}

/**
 * Convert visibility.
 *
 * @param string $string the readme string.
 *
 * @return string
 */
function wp_readme_visibility( $string ) {
	// Remove github comment.
	$string = preg_replace( '#<!-- only:github/ -->(.*?)<!-- /only:github -->#us', '', $string );
	// Display WordPress comment.
	$string = preg_replace_callback(
		'#<!-- only:wp>(.*?)</only:wp -->#us',
		function( $matches ) {
			return trim( $matches[1] );
		},
		$string
	);
	// Handle env variable.

	if ( $var = getenv( 'WP_README_ENV' ) ) {
		$string = preg_replace_callback(
			sprintf( '#<!-- only:%1$s>(.*?)</only:%1$s -->#us', $var ),
			function( $matches ) {
				return trim( $matches[1] );
			},
			$string
		);
		$string = preg_replace_callback(
			'#<!-- not:([^/]+)/ -->(.*?)<!-- /not:[^ ]+ -->#us',
			function( $matches ) use ( $var ) {
				if ( $var === $matches[1] ) {
					return '';
				} else {
					return trim( $matches[2] );
				}
			},
			$string
		);
	}

	// fix the newlines.
	$string = str_replace( array( "\r\n", "\r" ), "\n", $string );
	$string = preg_replace( "/\n\n+/", "\n\n", $string );
	$string = trim( $string ) . "\n";

	return $string;
}

// This file is executed as main routine.
if ( ! debug_backtrace() ) {
	$file = wp_readme_find( getenv( 'WP_README_DIR' ) ?: '.' );
	try {
		// File not found.
		if ( ! $file ) {
			throw new Exception( 'No README.md in current directory.' );
		}
		echo 'readme.md found...' . PHP_EOL;
		if ( wp_readme_replace( $file ) ) {
			echo 'readme.txt generated successfully!' . PHP_EOL;
		}
	} catch ( Exception $e ) {
		echo '[ERROR]' . $e->getMessage() . PHP_EOL;
		exit( 1 );
	}
}
