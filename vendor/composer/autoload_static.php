<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit302cdaa4af9e51fa355523ce909cfb17
{
    public static $files = array (
        '712263cd6b22ec9ea795d59ae1ebda80' => __DIR__ . '/..' . '/prospress/action-scheduler/action-scheduler.php',
    );

    public static $classMap = array (
        'AllowFieldTruncationHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'AssignmentRuleHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'CallOptions' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'Email' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceEmail.php',
        'EmailHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'LocaleOptions' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'LoginScopeHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'MassEmailMessage' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceEmail.php',
        'MruHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'PackageVersion' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'PackageVersionHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'ProcessRequest' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceProcessRequest.php',
        'ProcessSubmitRequest' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceProcessRequest.php',
        'ProcessWorkitemRequest' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceProcessRequest.php',
        'ProxySettings' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/ProxySettings.php',
        'QueryOptions' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'QueryResult' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceBaseClient.php',
        'SObject' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceBaseClient.php',
        'SforceBaseClient' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceBaseClient.php',
        'SforceCustomField' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceMetaObject.php',
        'SforceCustomObject' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceMetaObject.php',
        'SforceEnterpriseClient' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceEnterpriseClient.php',
        'SforceMetadataClient' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceMetadataClient.php',
        'SforcePartnerClient' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforcePartnerClient.php',
        'SforceSearchResult' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceBaseClient.php',
        'SforceSoapClient' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforcePartnerClient.php',
        'SingleEmailMessage' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceEmail.php',
        'UserTerritoryDeleteHeader' => __DIR__ . '/..' . '/developerforce/force.com-toolkit-for-php/soapclient/SforceHeaderOptions.php',
        'WP_Logging' => __DIR__ . '/..' . '/pippinsplugins/wp-logging/WP_Logging.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->classMap = ComposerStaticInit302cdaa4af9e51fa355523ce909cfb17::$classMap;

        }, null, ClassLoader::class);
    }
}
