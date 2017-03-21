<form method="post" action="<?php echo admin_url( 'admin-post.php' ); ?>" class="fieldmap">
    <input type="hidden" name="redirect_url_error" value="<?php echo $error_url; ?>" />
    <input type="hidden" name="redirect_url_success" value="<?php echo $success_url; ?>" />
    <?php
    if ( isset( $transient ) ) {
    ?>
    <input type="hidden" name="transient" value="<?php echo $transient; ?>" />
    <?php    
    }
    ?>
    <input type="hidden" name="action" value="post_fieldmap" >
    <input type="hidden" name="method" value="<?php echo $method; ?>" />
    <?php if ( $method === 'edit' ) {
    ?>
    <input type="hidden" name="id" value="<?php echo $map['id']; ?>" />
    <?php
    }
    ?>
    <div class="fieldmap_label">
        <label for="label">Label: </label>
        <input type="text" id="label" name="label" required value="<?php echo isset( $label ) ? $label : ''; ?>" />
    </div>
    <fieldset class="wordpress_side">
        <div class="wordpress_object">
            <label for="wordpress_object">WordPress Object: </label>
            <select id="wordpress_object" name="wordpress_object" required>
                <option value="">- Select object type -</option>
                <?php
                $wordpress_objects = $this->wordpress->wordpress_objects;
                foreach ( $wordpress_objects as $object ) {
                    if ( isset( $wordpress_object ) && $wordpress_object === $object ) {
                        $selected = ' selected';
                    } else {
                        $selected = '';
                    }
                    echo '<option value="' . $object . '"' . $selected . '>' . $object . '</option>';
                }
                ?>
            </select>
        </div>
    </fieldset>
    <fieldset class="salesforce_side">
        <div class="salesforce_object">
            <label for="salesforce_object">Salesforce Object: </label>
            <div class="spinner"></div>
            <select id="salesforce_object" name="salesforce_object" required>
                <option value="">- Select object type -</option>
                <?php
                $sfapi = $this->salesforce['sfapi'];
                $object_filters = maybe_unserialize( get_option( 'salesforce_api_object_filters' ), array() );
                $conditions = array();
                if ( in_array( 'updateable', $object_filters ) ) {
                    $conditions['updateable'] = true;
                }
                if ( in_array( 'triggerable', $object_filters ) ) {
                    $conditions['triggerable'] = true;
                }
                $salesforce_objects = $sfapi->objects( $conditions );
                foreach ( $salesforce_objects as $object ) {
                    if ( isset( $salesforce_object ) && $salesforce_object === $object['name'] ) {
                        $selected = ' selected';
                    } else {
                        $selected = '';
                    }
                    echo '<option value="' . $object['name'] . '"' . $selected . '>' . $object['label'] . '</option>';
                }
                ?>
            </select>
        </div>
        <div class="salesforce_record_types_allowed">
            <?php
            if ( isset( $salesforce_record_types_allowed ) ) {
                $record_types = $this->get_salesforce_object_description( array( 'salesforce_object' => $salesforce_object, 'include' => 'recordTypeInfos' ) );
                if ( isset( $record_types['recordTypeInfos'] ) ) {
                    echo '<label for="salesforce_record_types_allowed">Allowed Record Types:</label>';
                    echo '<div class="checkboxes">';
                    foreach ( $record_types['recordTypeInfos'] as $key => $value ) {
                        if ( in_array( $key, $salesforce_record_types_allowed ) ) {
                            $checked = ' checked';
                        } else {
                            $checked = '';
                        }
                        echo '<label><input type="checkbox" class="form-checkbox" value="' . $key . '" name="salesforce_record_types_allowed[' . $key . ']" id="salesforce_record_types_allowed-' . $key . '" ' . $checked . '> ' . $value . '</label>';
                    }
                    echo '</div>';
                }
            }
            ?>
        </div>
        <div class="salesforce_record_type_default">
            <?php
            if ( isset( $salesforce_record_type_default ) ) {
                $record_types = $this->get_salesforce_object_description( array( 'salesforce_object' => $salesforce_object, 'include' => 'recordTypeInfos' ) );
                if ( isset( $record_types['recordTypeInfos'] ) ) {
                    echo '<label for="salesforce_record_type_default">Default Record Type:</label>';
                    echo '<select id="salesforce_record_type_default" name="salesforce_record_type_default" required><option value="">- Select record type -</option>';
                    foreach ( $record_types['recordTypeInfos'] as $key => $value ) {
                        if ( isset( $salesforce_record_type_default ) && $salesforce_record_type_default === $key ) {
                            $selected = ' selected';
                        } else {
                            $selected = '';
                        }
                        if ( !isset( $salesforce_record_types_allowed ) || in_array( $key, $salesforce_record_types_allowed ) ) {
                            echo '<option value="' . $key . '"' . $selected . '>' . $value . '</option>';
                        }
                    }
                    echo '</select>';
                }
            }
            ?>
        </div>
        <div class="pull_trigger_field">
            <?php
            if ( isset( $pull_trigger_field ) ) {
                echo '<label for="pull_trigger_field">Date field to trigger pull:</label>';
                $object_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object, 'type' => 'datetime' ) );
                echo '<select name="pull_trigger_field" id="pull_trigger_field">';
                foreach( $object_fields as $key => $value ) {
                    if ( $pull_trigger_field === $value['name'] ) {
                        $selected = ' selected';
                    } else {
                        $selected = '';
                    }
                    echo '<option value="' . $value['name'] . '" ' . $selected . '>' . $value['label'] . '</option>';
                }
                echo '</select>';
            }
            ?>
        </div>
    </fieldset>
    <fieldset class="fields">
        <legend>Fieldmap</legend>
        <table class="wp-list-table widefat striped fields">
            <thead>
                <tr>
                    <th class="column-wordpress_field">WordPress Field</th>
                    <th class="column-salesforce_field">Salesforce Field</th>
                    <th class="column-is_prematch">Prematch</th>
                    <th class="column-is_key">Salesforce Key</th>
                    <th class="column-direction">Direction</th>
                    <th class="column-is_delete">Delete</th>
                </tr>
            </thead>
            <tbody>
                <?php
                if ( isset( $fieldmap_fields ) && $fieldmap_fields !== null && is_array( $fieldmap_fields ) ) {
                    foreach ( $fieldmap_fields as $key => $value ) {
                ?>
                <tr>
                    <td class="column-wordpress_field">
                        <select name="wordpress_field[<?php echo $key; ?>]" id="wordpress_field-<?php echo $key; ?>">
                            <option value="">- Select WordPress field -</option>
                            <?php
                            $wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
                            foreach ( $wordpress_fields as $wordpress_field ) {
                                if ( isset( $value['wordpress_field']['label'] ) && $value['wordpress_field']['label'] === $wordpress_field['key'] ) {
                                    $selected = ' selected';
                                } else {
                                    $selected = '';
                                }
                                echo '<option value="' . $wordpress_field['key'] . '"' . $selected . '> ' . $wordpress_field['key'] . '</option>';
                            }
                            ?>
                        </select>
                        
                    </td>
                    <td class="column-salesforce_field">
                        <select name="salesforce_field[<?php echo $key; ?>]" id="salesforce_field-<?php echo $key; ?>">
                            <option value="">- Select Salesforce field -</option>
                            <?php
                            $salesforce_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object ) );
                            foreach ( $salesforce_fields as $salesforce_field ) {
                                if ( isset( $value['salesforce_field']['label'] ) && $value['salesforce_field']['label'] === $salesforce_field['name'] ) {
                                    $selected = ' selected';
                                } else {
                                    $selected = '';
                                }
                                echo '<option value="' . $salesforce_field['name'] . '"' . $selected . '> ' . $salesforce_field['label'] . '</option>';
                            }
                            ?>
                        </select>
                        
                    </td>
                    <td class="column-is_prematch">
                        <?php
                        if ( isset( $value['is_prematch'] ) && $value['is_prematch'] === '1' ) {
                            $checked = ' checked';
                        } else {
                            $checked = '';
                        }
                        ?>
                        <input type="checkbox" name="is_prematch[<?php echo $key; ?>]" id="is_prematch-<?php echo $key; ?>" value="1" <?php echo $checked; ?> title="This pair should be checked for existing matches in Salesforce before adding" />
                    </td>
                    <td class="column-is_key">
                        <?php
                        if ( isset( $value['is_key'] ) && $value['is_key'] === '1' ) {
                            $checked = ' checked';
                        } else {
                            $checked = '';
                        }
                        ?>
                        <input type="checkbox" name="is_key[<?php echo $key; ?>]" id="is_key-<?php echo $key; ?>" value="1" <?php echo $checked; ?> title="This Salesforce field is an External ID in Salesforce" />
                    </td>
                    <td class="column-direction">
                        <?php
                        if ( isset( $value['direction'] ) ) {
                            if ( $value['direction'] === 'sf_wp' ) {
                                $checked_sf_wp = ' checked';
                                $checked_wp_sf = '';
                                $checked_sync = '';
                            } elseif ( $value['direction'] === 'wp_sf' ) {
                                $checked_sf_wp = '';
                                $checked_wp_sf = ' checked';
                                $checked_sync = '';
                            } else {
                                $checked_sf_wp = '';
                                $checked_wp_sf = '';
                                $checked_sync = ' checked';
                            }
                        } else {
                            $checked_sf_wp = '';
                            $checked_wp_sf = '';
                            $checked_sync = ' checked'; // by default, start with Sync checked
                        }
                        
                        ?>
                        <div class="radios">
                            <label><input type="radio" value="sf_wp" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-sf-wp" <?php echo $checked_sf_wp; ?> required>  Salesforce to WordPress</label>
                            <label><input type="radio" value="wp_sf" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-wp-sf" <?php echo $checked_wp_sf; ?> required>  WordPress to Salesforce</label>
                            <label><input type="radio" value="sync" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-sync" <?php echo $checked_sync; ?> required>  Sync</label>
                        </div>
                    </td>
                    <td class="column-is_delete">
                        <input type="checkbox" name="is_delete[<?php echo $key; ?>]" id="is_delete-<?php echo $key; ?>" value="1" />
                    </td>
                </tr>
                <?php
                    }   
                } elseif ( isset( $wordpress_object ) && isset( $salesforce_object ) ) {
                ?>
                <tr>
                    <td class="column-wordpress_field">
                        <select name="wordpress_field[0]" id="wordpress_field-0">
                            <option value="">- Select WordPress field -</option>
                            <?php
                            $wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
                            foreach ( $wordpress_fields as $wordpress_field ) {
                                echo '<option value="' . $wordpress_field['key'] . '"> ' . $wordpress_field['key'] . '</option>';
                            }
                            ?>
                        </select>
                    </td>
                    <td class="column-salesforce_field">
                        <select name="salesforce_field[0]" id="salesforce_field-0">
                            <option value="">- Select Salesforce field -</option>
                            <?php
                            $salesforce_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object ) );
                            foreach ( $salesforce_fields as $salesforce_field ) {
                                echo '<option value="' . $salesforce_field['name'] . '"> ' . $salesforce_field['label'] . '</option>';
                            }
                            ?>
                        </select>
                    </td>
                    <td class="column-is_prematch">
                        <input type="checkbox" name="is_prematch[0]" id="is_prematch-0" value="1" />
                    </td>
                    <td class="column-is_key">
                        <input type="checkbox" name="is_key[0]" id="is_key-0" value="1" />
                    </td>
                    <td class="column-direction">
                        <div class="radios">
                            <label><input type="radio" value="sf_wp" name="direction[0]" id="direction-0-sf-wp" required>  Salesforce to WordPress</label>
                            <label><input type="radio" value="wp_sf" name="direction[0]" id="direction-0-wp-sf" required>  WordPress to Salesforce</label>
                            <label><input type="radio" value="sync" name="direction[0]" id="direction-0-sync" required checked>  Sync</label>
                        </div>
                    </td>
                    <td class="column-is_delete">
                        <input type="checkbox" name="is_delete[0]" id="is_delete-0" value="1" />
                    </td>
                </tr>
                <?php
                }
                ?>
            </tbody>
        </table>
        <!--<div class="spinner"></div>-->
        <?php
        if ( isset( $fieldmap_fields ) && $fieldmap_fields !== null ) {
            $add_button_label = 'Add another field mapping';
        } else {
            $add_button_label = 'Add field mapping';
        }
        ?>
        <p><button type="button" id="add-field-mapping" class="button button-secondary"><?php echo $add_button_label; ?></button></p>
        <p class="description">Prematch tells the plugin to match records that have the same value before sending data to Salesforce. Salesforce Key indicates the Salesforce field is an External ID. If either of these is checked, the plugin will do an UPSERT to avoid duplicate data when possible.</p>
    </fieldset>
    <fieldset class="sync_triggers">
        <legend>Action triggers</legend>
        <div class="checkboxes">
            <?php
            $wordpress_create_checked = '';
            $wordpress_update_checked = '';
            $wordpress_delete_checked = '';
            $salesforce_create_checked = '';
            $salesforce_update_checked = '';
            $salesforce_delete_checked = '';
            if ( isset( $sync_triggers ) && is_array( $sync_triggers ) ) {
                foreach ( $sync_triggers as $trigger ) {
                    switch ($trigger) {
                        case $this->mappings->sync_wordpress_create:
                            $wordpress_create_checked = ' checked';
                            break;
                        case $this->mappings->sync_wordpress_update:
                            $wordpress_update_checked = ' checked';
                            break;
                        case $this->mappings->sync_wordpress_delete:
                            $wordpress_delete_checked = ' checked';
                            break;
                        case $this->mappings->sync_sf_create:
                            $salesforce_create_checked = ' checked';
                            break;
                        case $this->mappings->sync_sf_update:
                            $salesforce_update_checked = ' checked';
                            break;
                        case $this->mappings->sync_sf_delete:
                            $salesforce_delete_checked = ' checked';
                            break;
                    }
                }
            }
            ?>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_create; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-create" <?php echo $wordpress_create_checked; ?>> WordPress create</label>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_update; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-update" <?php echo $wordpress_update_checked; ?>>WordPress update</label>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_delete; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-delete" <?php echo $wordpress_delete_checked; ?>>WordPress delete</label>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_create; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-create" <?php echo $salesforce_create_checked; ?>> Salesforce create</label>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_update; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-update" <?php echo $salesforce_update_checked; ?>> Salesforce update</label>
            <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_delete; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-delete" <?php echo $salesforce_delete_checked; ?>> Salesforce delete</label>
            <p class="description">Select which actions on WordPress objects and Salesforce objects should trigger a synchronization. These settings are used by the <code>salesforce_push</code> and <code>salesforce_pull</code> modules respectively.</p>
        </div>
        <div class="checkboxes">
            <label><input type="checkbox" name="push_async" id="process-async" value="1" <?php echo isset( $push_async ) && $push_async === '1' ? ' checked' : ''; ?>> Process asynchronously</label>
            <p class="description">If selected, push data will be queued for processing and synchronized when <code>wp_cron</code> is run. This may increase site performance, but changes will not be reflected in real time.</p>
        </div>
        <div class="checkboxes">
            <label><input type="checkbox" name="push_drafts" id="push-drafts" value="1" <?php echo isset( $push_drafts ) && $push_drafts === '1' ? ' checked' : ''; ?>> Push drafts</label>
            <p class="description">If selected, WordPress will send drafts of this object type (if it creates drafts for it) to Salesforce.</p>
        </div>
        <div class="fieldmap_label">
            <label for="label">Weight: </label>
            <input type="number" id="weight" name="weight" value="<?php echo isset( $weight ) ? $weight : ''; ?>" />
            <p class="description">Weight is intended for use when you have multiple fieldmaps for the same object, either in WordPress or Salesforce.</p>
            <p class="description">For example, if you map WordPress users to Salesforce Contacts, and then map the users to Salesforce Leads as well, you could assign a numeric weight to indicate which one gets processed first. Otherwise, you can safely leave it blank. If present, sorting occurs in ascending order.</p>
        </div>
    </fieldset>
    <?php echo submit_button( ucfirst( $method ) . ' fieldmap' ); ?>
</form>