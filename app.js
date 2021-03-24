const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=9185f79a-572d-4bac-8956-a380b4ecf8f0";

async function fetchObjects() {
  onFetchStart();
  const url = `${BASE_URL}/object?${KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

// fetchObjects().then((x) => console.log(x));

async function fetchAllCenturies() {
  onFetchStart();
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchAllClassifications() {
  onFetchStart();
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

  if (localStorage.getItem("classification")) {
    return JSON.parse(localStorage.getItem("classification"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("classification", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function prefetchCategoryList() {
  onFetchStart();
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    $(".classification-count").text(`(${classifications.length})`);
    classifications.forEach((classification) => {
      $("#select-classification").append(
        $(
          `<option value="${classification.name}">${classification.name}</option>`
        )
      );
    });

    $(".century-count").text(`(${centuries.length})`);
    centuries.forEach((century) => {
      $("#select-century").append(
        $(`<option value="${century.name}">${century.name}</option>`)
      );
    });
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

function buildSearchString() {
  const baseURL = `${BASE_URL}/object?${KEY}`;
  const classification = $("#select-classification").val();
  const century = $("#select-century").val();
  const keyword = $("#keywords").val();
  const searchURL = `${baseURL}&classification=${classification}&century=${century}&keyword=${keyword}`;

  return searchURL;
}

$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();

  try {
    const response = await fetch(buildSearchString());
    const { records, info } = await response.json();
    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

function renderPreview(record) {
  const { description, primaryimageurl, title } = record;

  return $(`
    <div class="object-preview">
      <a href="#">
        ${primaryimageurl ? `<img src="${primaryimageurl}"/>` : ""} 
        <h3>${title}</h3>
        ${description ? `<h3>${description}</h3>` : ""}
        
      </a>
    </div>`).data("record", record);
}

function updatePreview(records, info) {
  const root = $("#preview");

  if (info.next) {
    root.find(".next").data("url", info.next).attr("disabled", false);
  } else {
    root.find(".next").data("url", null).attr("diabled", true);
  }

  if (info.prev) {
    root.find(".previous").data("url", info.prev).attr("disabled", false);
  } else {
    root.find(".previous").data("url", null).attr("disabled", true);
  }

  const resultsElement = root.find(".results");
  resultsElement.empty();
  records.forEach((record) => {
    resultsElement.append(renderPreview(record));
  });
}

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();

  try {
    const url = $(this).data("url");
    const response = await fetch(url);
    const { records, info } = await response.json();

    updatePreview(records, info);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  const objPreview = $(this).closest(".object-preview");
  const record = objPreview.data("record");
  $("#feature").html(renderFeature(record));
});

function renderFeature(record) {
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;

  return $(`
    <div class="object-feature">
      <header>
        <h3>${title}</h3>
        <h4>${dated}</h4>
      </header>
      <section class="facts">
        ${factHTML("Description", description)}
        ${factHTML("Culture", culture, "culture")}
        ${factHTML("Style", style)}
        ${factHTML("Technique", technique, "technique")}
        ${factHTML("Medium", medium, "medium")}
        ${factHTML("Dimensions", dimensions)}
        ${
          people
            ? people
                .map(function (person) {
                  return factHTML("Person", person.displayname, "person");
                })
                .join("")
            : ""
        }
        ${factHTML("Department", department)}
        ${factHTML("Division", division)}
        ${factHTML(
          "Contact",
          `<a target="_blank" href="mailto:${contact}">${contact}</a>`
        )}
        ${factHTML("Credit", creditline)}
      </section>
      <section class = "photos">
          ${photosHTML(images, primaryimageurl)}
    </div>`);
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return "";
  } else if (!searchTerm) {
    return `
    <span class="title">${title}</span>
    <span class="content">${content}
    `;
  } else {
    return `
      <span class="title">${title}</span>
      <a href="${searchURL(searchTerm, content)}>
      <span class="content">${content}</span></a>`;
  }
}

function searchURL(searchType, searchString) {
  return encodeURI(`${BASE_URL}/object?${KEY}&${searchType}=${searchString}`);
}

function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    return images
      .map((image) => `<img src="${image.baseimageurl}" />`)
      .join("");
  } else if (primaryimageurl) {
    return `<img src="${primaryimageurl}" />`;
  } else {
    return "";
  }
}

$("#feature").on("click", "a", async function (event) {
  const url = $(this).attr("href");
  if (url.startsWith("mailto")) {
    return;
  }

  event.preventDefault();

  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();
    const info = data.info;
    const records = data.records;
    if (records.length > 0) {
      updatePreview(records, info);
    } else {
      alert("Nothing Found.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

prefetchCategoryList();
