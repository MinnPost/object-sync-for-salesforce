<?php
//require_once plugin_dir_path( dirname( __FILE__ ) ) . 'vendor/autoload.php';


$provider = new Stevenmaguire\OAuth2\Client\Provider\Salesforce([
    'clientId'          => $this->get_setting_value( $this->settings, 'salesforce_consumer_key' ),
    'clientSecret'      => $this->get_setting_value( $this->settings, 'salesforce_consumer_secret' ),
    'redirectUri'       => $this->get_setting_value( $this->settings, 'salesforce_callback_url' )
]);






if (!isset($_GET["code"]) && $_SERVER["REQUEST_METHOD"] === "POST") {
    // If we don"t have an authorization code then get one
    $authUrl = $provider->getAuthorizationUrl();
    $_SESSION["oauth2state"] = $provider->getState();
    header("Location: ".$authUrl);
    exit;
// Check given state against previously stored one to mitigate CSRF attack
// (Step 3 just happened and the user was redirected back)
} elseif (empty($_GET["state"]) || ($_GET["state"] !== $_SESSION["oauth2state"])) {
    unset($_SESSION["oauth2state"]);
    exit("Invalid state");
} else {
    // Try to get an access token (using the authorization code grant)
    // (Step 4)
    $token = $provider->getAccessToken("authorization_code", [
        "code" => $_GET["code"]
    ]);
    
    // Save the token for future use
    update_option( "github_token", $token->getToken(), TRUE );
}
