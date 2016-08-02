<?php
/**
 * @file
 */

class Wordpress {

	protected $wpdb;
    protected $version;
    protected $text_domain;

    /**
    * Objects, properties, and methods to get core WordPress data for the plugin
    *
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    * @throws \Exception
    */
	public function __construct( $wpdb, $version, $text_domain ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->text_domain = $text_domain; 
	}

}