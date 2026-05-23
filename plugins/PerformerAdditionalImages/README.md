# Performer Additional Images

Adds multiple alternate images to Stash performer pages and displays the performer header image as a carousel.

## Custom fields

This plugin keeps the original `SecondaryPerformerImage` custom field contract:

- `alt_image` is secondary image 1.
- `alt_image_2`, `alt_image_3`, and higher numbered fields are additional secondary images.

Existing performers that already use `alt_image` will continue to work.

## Usage

On a performer edit page, use **Add additional performer image...** to add the next available alternate image. Existing empty alternate-image fields are filled first. If all existing alternate-image fields already have values, the plugin creates the next numbered field.

On a performer details page, the carousel button on the performer image cycles through the primary image and every populated alternate image field.
