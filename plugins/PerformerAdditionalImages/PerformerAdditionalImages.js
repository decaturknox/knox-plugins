(() => {
  const PluginApi = window.PluginApi;
  if (!PluginApi) {
    console.error("[PerformerAdditionalImages] PluginApi is unavailable");
    return;
  }

  const React = PluginApi.React;
  const { Button } = PluginApi.libraries.Bootstrap;
  const { HoverPopover } = PluginApi.components;
  const StashService = PluginApi.utils && PluginApi.utils.StashService;

  const pluginId = "PerformerAdditionalImages";
  const fieldBase = "alt_image";
  const fieldPattern = /^alt_image(?:_(\d+))?$/;
  const pendingFieldsByPerformer = new Map();

  function isAdditionalImageField(field) {
    return fieldBase === field || fieldPattern.test(field);
  }

  function getAdditionalImageIndex(field) {
    if (field === fieldBase) {
      return 1;
    }

    const match = field.match(fieldPattern);
    if (!match || !match[1]) {
      return Number.MAX_SAFE_INTEGER;
    }

    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }

  function normalizeImageValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function getAdditionalImages(customFields) {
    if (!customFields || typeof customFields !== "object") {
      return [];
    }

    return Object.entries(customFields)
      .filter(([field]) => isAdditionalImageField(field))
      .map(([field, value]) => ({
        field,
        index: getAdditionalImageIndex(field),
        value: normalizeImageValue(value),
      }))
      .filter((image) => image.value)
      .sort((a, b) => a.index - b.index || a.field.localeCompare(b.field));
  }

  function getAdditionalImageFields(customFields) {
    if (!customFields || typeof customFields !== "object") {
      return [];
    }

    return Object.keys(customFields)
      .filter(isAdditionalImageField)
      .sort((a, b) => getAdditionalImageIndex(a) - getAdditionalImageIndex(b));
  }

  function getKnownAdditionalImageFields() {
    const inputs = Array.from(
      document.querySelectorAll("div.custom-fields-input input[placeholder]")
    );

    return inputs
      .map((input) => input.getAttribute("placeholder") || "")
      .filter(isAdditionalImageField)
      .sort((a, b) => getAdditionalImageIndex(a) - getAdditionalImageIndex(b));
  }

  function getPendingFields(performerId) {
    if (!performerId) {
      return [];
    }

    return Array.from(pendingFieldsByPerformer.get(performerId) || []);
  }

  function getNextFieldName(fields) {
    const usedIndexes = new Set(
      fields.map(getAdditionalImageIndex).filter(Number.isFinite)
    );

    if (!usedIndexes.has(1)) {
      return fieldBase;
    }

    let nextIndex = 2;
    while (usedIndexes.has(nextIndex)) {
      nextIndex += 1;
    }

    return `${fieldBase}_${nextIndex}`;
  }

  function getPerformerIdFromLocation() {
    const match = window.location.pathname.match(/\/performers\/(\d+)/);
    return match ? match[1] : null;
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function expandCustomFields() {
    const toggle = document.querySelector("div.custom-fields-input > button");
    const panel = document.querySelector("div.custom-fields-input > div");

    if (
      toggle &&
      panel &&
      panel.classList.contains("collapse") &&
      !panel.classList.contains("show")
    ) {
      toggle.focus();
      toggle.click();
      await sleep(200);
    }
  }

  function findInputForField(field) {
    return document.querySelector(
      `div.custom-fields-input input[placeholder="${field}"]`
    );
  }

  function getWritableImageSlot(performerId) {
    const knownFields = [
      ...new Set([
        ...getKnownAdditionalImageFields(),
        ...getPendingFields(performerId),
      ]),
    ];

    const emptyField = knownFields.find((field) => {
      const input = findInputForField(field);
      return input && !normalizeImageValue(input.value);
    });

    if (emptyField) {
      return {
        field: emptyField,
        input: findInputForField(emptyField),
      };
    }

    const field = getNextFieldName(knownFields);
    return {
      field,
      input: findInputForField(field),
    };
  }

  function setNativeInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );

    if (!descriptor || !descriptor.set) {
      return false;
    }

    descriptor.set.call(input, value);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();
    return true;
  }

  function readFileAsDataURL(file, callback) {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (!reader.error) {
        callback(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  function handleImageChange(event, callback) {
    const file =
      event &&
      event.currentTarget &&
      event.currentTarget.files &&
      event.currentTarget.files[0];

    if (file) {
      readFileAsDataURL(file, callback);
    }
  }

  function CarouselIcon() {
    return React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        height: "24px",
        viewBox: "0 -960 960 960",
        width: "24px",
        fill: "currentColor",
        "aria-hidden": "true",
        focusable: "false",
      },
      React.createElement("path", {
        d: "M80-360v-240q0-33 23.5-56.5T160-680q33 0 56.5 23.5T240-600v240q0 33-23.5 56.5T160-280q-33 0-56.5-23.5T80-360Zm280 160q-33 0-56.5-23.5T280-280v-400q0-33 23.5-56.5T360-760h240q33 0 56.5 23.5T680-680v400q0 33-23.5 56.5T600-200H360Zm360-160v-240q0-33 23.5-56.5T800-680q33 0 56.5 23.5T880-600v240q0 33-23.5 56.5T800-280q-33 0-56.5-23.5T720-360Zm-360 80h240v-400H360v400Zm120-200Z",
      })
    );
  }

  function renderOriginal(original, props, key) {
    if (key === undefined) {
      return React.createElement(original, { ...props });
    }

    return React.createElement(original, { ...props, key });
  }

  function AlternatePerformerImage({ image, performer, isActive }) {
    const altText =
      performer && performer.name
        ? `${performer.name} alternate image ${image.index}`
        : `Performer alternate image ${image.index}`;

    return React.createElement("img", {
      className: `performer performer-additional-images__alternate${
        isActive ? " active" : ""
      }`,
      src: image.value,
      alt: altText,
      loading: "lazy",
    });
  }

  function PatchedPerformerHeaderImage({ original, originalProps }) {
    const props = originalProps;
    const performer = props.performer;
    const customFields = (performer && performer.custom_fields) || {};
    const additionalImages = getAdditionalImages(customFields);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const imageCount = additionalImages.length + 1;
    const safeActiveIndex = Math.min(activeIndex, imageCount - 1);

    React.useEffect(() => {
      setActiveIndex(0);
    }, [props.performer && props.performer.id]);

    React.useEffect(() => {
      if (activeIndex > imageCount - 1) {
        setActiveIndex(0);
      }
    }, [activeIndex, imageCount]);

    const primaryImage = renderOriginal(original, props);

    if (!additionalImages.length) {
      return React.createElement(React.Fragment, null, primaryImage);
    }

    return React.createElement(
      "div",
      {
        className: "performer-additional-images",
        "data-active-image": String(safeActiveIndex + 1),
        "data-image-count": String(imageCount),
      },
      React.createElement(
        "div",
        {
          className: `performer-additional-images__image${
            safeActiveIndex === 0 ? " active" : ""
          }`,
        },
        primaryImage
      ),
      additionalImages.map((image, index) =>
        React.createElement(AlternatePerformerImage, {
          key: image.field,
          image,
          performer,
          isActive: safeActiveIndex === index + 1,
        })
      ),
      React.createElement(
        Button,
        {
          type: "button",
          className: "performer-additional-images__button",
          title: `Show next performer image (${safeActiveIndex + 1} of ${imageCount})`,
          "aria-label": `Show next performer image (${safeActiveIndex + 1} of ${imageCount})`,
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setActiveIndex((index) => (index + 1) % imageCount);
          },
        },
        React.createElement(CarouselIcon)
      )
    );
  }

  PluginApi.patch.instead("PerformerHeaderImage", function (
    props,
    _context,
    original
  ) {
    return React.createElement(PatchedPerformerHeaderImage, {
      original,
      originalProps: props,
    });
  });

  function PatchedImageInput({ original, originalProps, updatePerformer }) {
    const props = originalProps;
    const performerId = getPerformerIdFromLocation();
    const isPerformerPage = Boolean(document.querySelector("#performer-page"));

    async function saveAdditionalImage(imageValue) {
      if (!imageValue) {
        return;
      }

      await expandCustomFields();

      const slot = getWritableImageSlot(performerId);

      if (slot.input && setNativeInputValue(slot.input, imageValue)) {
        return;
      }

      if (!performerId || !updatePerformer) {
        console.warn(
          `[${pluginId}] Unable to find a custom-field input for ${slot.field}.`
        );
        return;
      }

      await updatePerformer({
        variables: {
          input: {
            id: performerId,
            custom_fields: {
              partial: {
                [slot.field]: imageValue,
              },
            },
          },
        },
      });

      const pendingFields =
        pendingFieldsByPerformer.get(performerId) || new Set();
      pendingFields.add(slot.field);
      pendingFieldsByPerformer.set(performerId, pendingFields);
    }

    const primaryInput = renderOriginal(original, props, "primary-image-input");

    if (!isPerformerPage) {
      return React.createElement(React.Fragment, null, primaryInput);
    }

    const additionalInput = renderOriginal(
      original,
      {
        ...props,
        text: "Add additional performer image...",
        onImageChange: (event) => handleImageChange(event, saveAdditionalImage),
        onImageURL: saveAdditionalImage,
      },
      "additional-image-input"
    );

    return React.createElement(
      React.Fragment,
      null,
      primaryInput,
      additionalInput
    );
  }

  function PatchedImageInputWithUpdate({ original, originalProps }) {
    const usePerformerUpdate = StashService && StashService.usePerformerUpdate;
    const [updatePerformer] = usePerformerUpdate();

    return React.createElement(PatchedImageInput, {
      original,
      originalProps,
      updatePerformer,
    });
  }

  PluginApi.patch.instead("ImageInput", function (props, _context, original) {
    const usePerformerUpdate = StashService && StashService.usePerformerUpdate;

    if (usePerformerUpdate) {
      return React.createElement(PatchedImageInputWithUpdate, {
        original,
        originalProps: props,
      });
    }

    return React.createElement(PatchedImageInput, {
      original,
      originalProps: props,
      updatePerformer: null,
    });
  });

  function PatchedCustomFieldInput({ original, originalProps }) {
    const props = originalProps;
    const field = props.field;
    const value = normalizeImageValue(props.value);
    const renderedInput = renderOriginal(original, props);

    if (!HoverPopover || !isAdditionalImageField(field) || !value) {
      return React.createElement(React.Fragment, null, renderedInput);
    }

    const popover = React.createElement(
      "div",
      { className: "performer-additional-images-popover" },
      React.createElement("img", {
        className: "performer-additional-images-popover__thumbnail",
        alt: field,
        src: value,
      })
    );

    return React.createElement(
      HoverPopover,
      {
        className: "scene-card__performer",
        placement: "top",
        content: popover,
        leaveDelay: 100,
      },
      renderedInput
    );
  }

  PluginApi.patch.instead("CustomFieldInput", function (
    props,
    _context,
    original
  ) {
    return React.createElement(PatchedCustomFieldInput, {
      original,
      originalProps: props,
    });
  });

  function PatchedCustomFields({ original, originalProps }) {
    const props = originalProps;
    const values = props.values;

    if (!values || typeof values !== "object") {
      return React.createElement(
        React.Fragment,
        null,
        renderOriginal(original, props)
      );
    }

    const filteredValues = Object.fromEntries(
      Object.entries(values).filter(([field]) => !isAdditionalImageField(field))
    );

    if (Object.keys(filteredValues).length === Object.keys(values).length) {
      return React.createElement(
        React.Fragment,
        null,
        renderOriginal(original, props)
      );
    }

    if (!Object.keys(filteredValues).length) {
      return React.createElement(React.Fragment, null);
    }

    return React.createElement(
      React.Fragment,
      null,
      renderOriginal(original, { ...props, values: filteredValues })
    );
  }

  PluginApi.patch.instead("CustomFields", function (props, _context, original) {
    return React.createElement(PatchedCustomFields, {
      original,
      originalProps: props,
    });
  });
})();
