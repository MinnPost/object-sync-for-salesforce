<input type="hidden" name="salesforce_create_mapped_user" value="1" />
<h2>Salesforce</h2>
<p>This user is not mapped to an object in Salesforce. You can run a push to send this object to Salesforce, which will cause it to follow the plugin's normal mapping conventions, or you can create a manual link to a Salesforce object.</p>
<table class="form-table">
    <tr>
        <th><label for="salesforce_id">Salesforce ID</label></th>
        <td>
            <input type="text" name="salesforce_id" id="salesforce_id" value="" class="regular-text" /><br />
            <span class="description">Enter a Salesforce object ID.</span>
            <p><strong>or</strong></p>
            <p><button type="submit" class="button button-secondary push_to_salesforce_button" name="push_new_user_to_salesforce">Push to Salesforce as new record</button></p>
        </td>
    </tr>
</table>
<div class="salesforce_user_ajax_message"></div>