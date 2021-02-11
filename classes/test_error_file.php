<?php
/**
 * Class file for Object_Sync_Sf_WordPress.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Work with the WordPress $wpdb object. This class can make read and write calls to the WordPress database, and also cache the responses.
 */
class Object_Sync_Sf_Test_Error {
    public function __construct(  ) {


		$this->errorTest();

    }
    
    function errorTest() {
        echo'test';
    }
}