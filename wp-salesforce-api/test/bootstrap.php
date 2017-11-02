<?php
/**
 * Unit test bootstrapper.
 * This is nothing close to an accurate simulation of WordPress environment, it's just for testing utils.
 */
 
function is_admin() {
    return false;
}

require __DIR__ . '/../salesforce-rest-api-wrapper.php';

$salesforce_api = new Salesforce_REST_API();
