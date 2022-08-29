//Constants Section start
const TourEditButtonSelector = ".buttonGroupOuter .editButton";
const TourAddButtonSelector = ".buttonGroupOuter .addButton";
const TourPresentButtonSelector = ".buttonGroupOuter .playButton";
const TourDownloadButtonSelector = ".buttonGroupOuter .downloadTourButton";
const TourDeleteButtonSelector = ".buttonGroupOuter .deleteButton";
const StepEditButtonSelector = ".buttonGroupInner .editButton";
const StepPresentButtonSelector = ".buttonGroupInner .playButton";
const StepDeleteButtonSelector = ".buttonGroupInner .deleteButton";
const ToggleElementSelector = ".toggle";
const CreateTourButtonSelector = ".CreateTour";
const TourFormSelector = ".TourForm";
const TourFormNameSelector = ".TourForm input";
const TourFormDescriptionSelector = ".TourForm textarea";
const TourFormCancelSelector = ".TourForm .cancelButton";
const TourFormSaveSelector = ".TourForm .saveButton";
const TourEditButtonsSelector = ".tourEditButtonsContainer";
const StepOrderButtonsContainerSelector='.stepOrderButtonsContainer';
const StepEditButtonsSelector = ".stepEditButtonsContainer";
const AccordionListSelector = ".AccordionList";
const UploadTourButtonSelector = ".UploadTour";
const HiddenInputElementSelector = "#hiddenFileInput";
const LoaderDivElementSelector = ".LoaderDiv";
//Constants Section end

//Global variable section start
var allDataForHostName = undefined;
var allStepElements = {};
var dragStartIndex = undefined;
var dragStartTourId = undefined;
//Global variable section end

//Utils Section Start
var getCurrentTab = async () => {
  let queryOptions = { active: true, lastFocusedWindow: true };
  /*The below is called destructuring syntax..(Read more about it here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
  An example:
      const obj = { a: 1, b: 2 };
      const { a, b } = obj;
      // is equivalent to:
      // const a = obj.a;
      // const b = obj.b;
  */
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

var getRandomId = function () {
  return crypto.randomUUID();
};

var removeExistingEventListeners = function (selector) {
  //Removing existing eventListeners by cloning process
  var selectedElements = document.querySelectorAll(selector);
  for (var i = 0; i < selectedElements.length; i++) {
    var cloneofSelectedElement = selectedElements[i].cloneNode(true);
    selectedElements[i].parentNode.replaceChild(
      cloneofSelectedElement,
      selectedElements[i]
    );
  }
};

var generateAndStoreTourPayload = function (tourId, tour) {
  console.log(tour);
  var prettifiedTour = JSON.stringify(tour, null, 2);
  var blob = new Blob([prettifiedTour], { type: "text/json" });
  //To add below to download button link
  var selector = "[tourId='" + tourId + "'] .downloadTourButton a";
  var tourElement = document.querySelector(selector);
  tourElement.download = tour.tourObj.tourName + ".json";
  tourElement.href = window.URL.createObjectURL(blob);
  tourElement.dataset.downloadurl = [
    "text/json",
    tourElement.download,
    tourElement.href,
  ].join(":");
};

var updateAllData = function (result) {
  allDataForHostName = result ? result : allDataForHostName;
};

var populateEditTourFields = function (result) {
  var tourId = result.tourId;
  var selector = "li[tourId='" + tourId + "']";
  var tourContainer = document.querySelector(selector);

  var tourEditElement = tourContainer.querySelector(".tourEdit");
  if (!tourEditElement) {
    var tourEditTemplate = document.getElementById("tourEditTemplate");
    tourEditElement =
      tourEditTemplate.content.firstElementChild.cloneNode(true);
    tourContainer.appendChild(tourEditElement);
  }
  tourEditElement.style.display = "flex";
  var inputElement = tourEditElement.querySelector("input");
  inputElement.value = result.tourObj.tourName;
  var textAreaElement = tourEditElement.querySelector("textarea");
  textAreaElement.style.minHeight = "100px";
  textAreaElement.value = result.tourObj.tourDescription;
  var tourEditButtonsSelector = selector + " " + TourEditButtonsSelector;
  console.log($(tourEditButtonsSelector));
  removeExistingEventListeners(tourEditButtonsSelector);
  var cancelButton = tourEditElement.querySelector(".tourEditCancelButton");
  var updateButton = tourEditElement.querySelector(".tourEditUpdateButton");
  cancelButton.addEventListener("click", function (e) {
    tourEditElement.style.display = "none";
    tourContainer.querySelector("a").style.color = "black";
    tourContainer.querySelector("a").style.backgroundColor = "white";
    var stepEditButtonsContainer=tourContainer.querySelector('.stepOrderButtonsContainer');
    if(stepEditButtonsContainer){
      updateAccordionList(allDataForHostName);
    }
  });
  updateButton.addEventListener("click", async function (e) {
    var loaderDiv = document.querySelector(LoaderDivElementSelector);
    loaderDiv.style.display = "flex";
    tourContainer.querySelector("a").style.color = "black";
    tourContainer.querySelector("a").style.backgroundColor = "white";
    var updatedTourName = inputElement.value;
    var updatedTourDescription = textAreaElement.value;
    const activeTab = await getCurrentTab();
    var urlObject = new URL(activeTab.url);
    //TODO: To store this in hashed manner later. This will be the key of our tourObj
    var tourHostName = urlObject.hostname;
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "UPDATETOUR",
        payload: {
          tourId: tourId,
          tourObj: {
            tourHostName: tourHostName,
            tourName: updatedTourName,
            tourDescription: updatedTourDescription,
          },
        },
      },
      updateAccordionList
    );
  });
};

var populateEditStepFields = function (result) {
  var stepId = result.stepId;
  var selector = 'li[stepId="' + stepId + '"]';
  var stepContainer = document.querySelector(selector);
  var tourId = stepContainer.getAttribute("parentTourId");
  var stepEditElement = stepContainer.querySelector(".stepEdit");
  if (!stepEditElement) {
    var stepEditTemplate = document.getElementById("stepEditTemplate");
    stepEditElement =
      stepEditTemplate.content.firstElementChild.cloneNode(true);
    stepContainer.appendChild(stepEditElement);
  }
  stepEditElement.style.display = "flex";
  //populate all the stepEdit Fields which we got from result
  var stepNameInputElement = stepEditElement.querySelector(
    ".stepNameLabel input"
  );
  var stepDescriptionTextAreaElement = stepEditElement.querySelector(
    ".stepDescriptionLabel textarea"
  );
  var stepSelectorTextAreaElement = stepEditElement.querySelector(
    ".stepSelectorLabel textarea"
  );
  var stepEventInputElement = stepEditElement.querySelector(
    ".stepEventLabel input"
  );

  stepNameInputElement.value = result.stepName;
  stepDescriptionTextAreaElement.value = result.stepDescription;
  stepSelectorTextAreaElement.value = result.stepElementPath;
  stepEventInputElement.value = result.stepEvent;

  //Add eventListeners for update and cancel stepEdit buttons
  var stepEditButtonsSelector = selector + " " + StepEditButtonsSelector;
  removeExistingEventListeners(stepEditButtonsSelector);
  var stepEditCancelButton = stepEditElement.querySelector(
    ".stepEditCancelButton"
  );
  var stepEditUpdateButton = stepEditElement.querySelector(
    ".stepEditUpdateButton"
  );
  stepEditCancelButton.addEventListener("click", function (e) {
    var stepElement = stepContainer.querySelector(".StepElement");
    stepElement.style.backgroundColor = "inherit";
    stepElement.style.color = "black";
    stepEditElement.style.display = "none";
  });
  stepEditUpdateButton.addEventListener("click", async function (e) {
    var loaderDiv = document.querySelector(LoaderDivElementSelector);
    loaderDiv.style.display = "flex";
    var updatedStepName = stepNameInputElement.value;
    var updatedStepDescription = stepDescriptionTextAreaElement.value;
    var updatedStepEvent = stepEventInputElement.value;
    var updatedStepSelector = stepSelectorTextAreaElement.value;
    const activeTab = await getCurrentTab();
    var urlObject = new URL(activeTab.url);
    //TODO: To store this in hashed manner later. This will be the key of our tourObj
    var tourHostName = urlObject.hostname;
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "UPDATESTEP",
        payload: {
          tourId: tourId,
          tourObj: {
            tourHostName: tourHostName,
            steps: [
              {
                stepId: stepId,
                stepName: updatedStepName,
                stepDescription: updatedStepDescription,
                stepElementPath: updatedStepSelector,
                stepEvent: updatedStepEvent,
              },
            ],
          },
        },
      },
      updateAccordionList
    );
  });
};
//Utils Section End

var toggleElementFunction = function () {
  removeExistingEventListeners(ToggleElementSelector);
  var toggleElements = document.querySelectorAll(ToggleElementSelector);
  toggleElements.forEach(function (toggleElement) {
    toggleElement.addEventListener("click", function (e) {
      e.preventDefault();
      var outerTourElement = e.target.parentElement.parentElement;
      var tourEditElement = outerTourElement.querySelector(".tourEdit");
      if (tourEditElement) {
        tourEditElement.style.display = "none";
      }
      var stepOrderButtonsContainer=outerTourElement.querySelector('.stepOrderButtonsContainer');
      if(stepOrderButtonsContainer&& stepOrderButtonsContainer.style.display==='flex'){
        stepOrderButtonsContainer.style.display==='none';
        updateAccordionList(allDataForHostName);
      }
      var innerElementList = outerTourElement.querySelectorAll(".inner");
      if (innerElementList.length) {
        for (var i = 0; i < innerElementList.length; i++) {
          var currentInnerElement = innerElementList[i];
          if (
            currentInnerElement.style.display === "none" ||
            currentInnerElement.style.display === ""
          ) {
            e.target.style.backgroundColor = "black";
            e.target.style.color = "white";
            currentInnerElement.style.display = "block";
          } else {
            e.target.style.backgroundColor = "white";
            e.target.style.color = "black";
            currentInnerElement.style.display = "none";
          }
        }
      }
    });
  });
};

var createAndAppendTourEditElements = async function (tourContainer, tourId) {
  var innerElementList = tourContainer.querySelectorAll(".inner");
  tourContainer.querySelector("a").style.backgroundColor = "black";
  tourContainer.querySelector("a").style.color = "white";
  innerElementList.forEach(function (innerElement) {
    innerElement.style.display = "none";
  });
  const activeTab = await getCurrentTab();
  var urlObject = new URL(activeTab.url);
  //TODO: To store this in hashed manner later. This will be the key of our tourObj
  var tourHostName = urlObject.hostname;
  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "GETTOUR",
      payload: {
        tourId: tourId,
        tourObj: {
          tourHostName: tourHostName,
        },
      },
    },
    populateEditTourFields
  );
};

var createAndAppendStepEditElements = async function (
  stepContainer,
  tourId,
  stepId
) {
  var stepElement = stepContainer.querySelector(".StepElement");
  stepElement.style.backgroundColor = "lightseagreen";
  stepElement.style.color = "white";
  const activeTab = await getCurrentTab();
  var urlObject = new URL(activeTab.url);
  //TODO: To store this in hashed manner later. This will be the key of our tourObj
  var tourHostName = urlObject.hostname;
  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "GETSTEP",
      payload: {
        tourId: tourId,
        tourObj: {
          tourHostName: tourHostName,
          steps: [
            {
              stepId: stepId,
            },
          ],
        },
      },
    },
    populateEditStepFields
  );
};

var updateAccordionList = function (currentStorageData = []) {
  if (currentStorageData.length) {
    updateAllData(currentStorageData);
  }
  allStepElements = {}; //To store the elements for using it in the drag and drop workflow later
  console.log(
    "CurrentStorageData in popup.js updateAccordionList method below: "
  );
  console.log(currentStorageData);
  var currentAccordionUlElement = document.querySelector(".AccordionList ul");
  currentAccordionUlElement.innerHTML = "";
  //should auto generate the elements and append to accordion list and then show the accordion and hide the input form
  var tourElementTemplate = document.getElementById("TourElementTemplate");

  for (var i = 0; i < currentStorageData.length; i++) {
    var tourId = currentStorageData[i].tourId;
    allStepElements[tourId] = [];
    var liElement = document.createElement("li");
    liElement.setAttribute("tourId", tourId);
    var tourElementCloned =
      tourElementTemplate.content.firstElementChild.cloneNode(true);
    tourElementCloned.querySelector("a").innerHTML =
      currentStorageData[i].tourObj.tourName;
    tourElementCloned
      .querySelector("a")
      .setAttribute("title", currentStorageData[i].tourObj.tourDescription);
    tourElementCloned
      .querySelector(".buttonGroupOuter")
      .setAttribute("tourId", tourId);
    liElement.appendChild(tourElementCloned);

    var steps = currentStorageData[i].tourObj?.steps;
    for (var j = 0; j < steps?.length; j++) {
      var currStepId = steps[j]?.stepId;
      var ulElement = document.createElement("ul");
      ulElement.setAttribute("class", "inner");
      ulElement.setAttribute("data-index", j);
      var stepElementTemplate = document.getElementById("StepElementTemplate");
      var stepElementCloned =
        stepElementTemplate.content.firstElementChild.cloneNode(true);
      stepElementCloned.querySelector(".StepText").innerHTML =
        steps[j].stepName;
      stepElementCloned
        .querySelector(".StepElement")
        .setAttribute("title", steps[j].stepDescription);
      stepElementCloned.setAttribute("stepId", currStepId);
      stepElementCloned.setAttribute("parentTourId", tourId);
      stepElementCloned
        .querySelector(".buttonGroupInner")
        .setAttribute("stepId", currStepId);
      stepElementCloned
        .querySelector(".buttonGroupInner")
        .setAttribute("parentTourId", tourId);
      ulElement.appendChild(stepElementCloned);
      allStepElements[tourId].push(ulElement);
      liElement.appendChild(ulElement);
    }
    currentAccordionUlElement.appendChild(liElement);
    //To update the anchor element of download Button for downloading
    generateAndStoreTourPayload(tourId, currentStorageData[i]);
  }
  var accordionListElement = document.querySelector(".AccordionList");
  var formInputElement = document.querySelector(".TourForm");
  var createTourButton = document.querySelector(".CreateTour");
  var createTourParent = createTourButton.parentElement;
  if (formInputElement.style.display === "flex") {
    accordionListElement.style.display = "block";
    createTourParent.style.display = "block";
    formInputElement.style.display = "none";
  }
  initiateAllEventListeners();

  //If loader is still present then remove it and also clearing the input field element just to be sure..
  var loaderDiv = document.querySelector(LoaderDivElementSelector);
  var hiddenInputFileElement = document.querySelector(
    HiddenInputElementSelector
  );
  if (loaderDiv.style.display === "flex") {
    loaderDiv.style.display = "none";
  }
  // hiddenInputFileElement.value='';
};

var addStepElementDragEventListeners = function () {
  var swapSteps = function (tourId, startIndex, endIndex) {
    const startStep =
      allStepElements[tourId][startIndex].querySelector(".draggable");
    const endStep =
      allStepElements[tourId][endIndex].querySelector(".draggable");
    allStepElements[tourId][startIndex].appendChild(endStep);
    allStepElements[tourId][endIndex].appendChild(startStep);
  };

  var dragStart = function () {
    dragStartIndex = this.closest("ul").getAttribute("data-index");
    dragStartTourId = this.getAttribute("parentTourId");
    var tourListElement=this.closest("ul").parentElement;
    tourListElement.style.border='2px solid black';
    var stepOrderButtonsTemplate=document.getElementById('StepOrderButtonsTemplate');
    var stepOrderButtonsDiv=tourListElement.querySelector('.stepOrderButtonsContainer');
    if(!stepOrderButtonsDiv){
      stepOrderButtonsDiv=stepOrderButtonsTemplate.content.firstElementChild.cloneNode(true);
      tourListElement.appendChild(stepOrderButtonsDiv);
    }

    $(stepOrderButtonsDiv.querySelector('.update')).off('click').on('click',async function(){
      //Update Button function
      var loaderDiv = document.querySelector(LoaderDivElementSelector);
      loaderDiv.style.display = "flex";
      const activeTab = await getCurrentTab();
      var urlObject=new URL(activeTab.url);
      var tourHostName=urlObject.hostname;
      var payload={
        tourId:dragStartTourId,
        tourObj:{
          tourHostName:tourHostName,
          "steps":[]
        }
      };
      var steps=allStepElements[payload.tourId]
      steps.forEach(function(step){
        var stepId={stepId:step.firstChild.getAttribute('stepId')};
        payload.tourObj.steps.push(stepId);
      });
      console.log("Payload for step order update: ",payload);
      chrome.tabs.sendMessage(
        activeTab.id,
        {
          type: "UPDATESTEPORDER",
          payload: payload
        },
        updateAccordionList
      );
    });

    $(stepOrderButtonsDiv.querySelector('.cancel')).off('click').on('click',function(){
      //Cancel Button Function
      var loaderDiv = document.querySelector(LoaderDivElementSelector);
      loaderDiv.style.display = "flex";
      //To rearrange the steps to original order
      updateAccordionList(allDataForHostName);
    });

    stepOrderButtonsDiv.style.display='flex';
    console.log("DragStart Index", dragStartIndex);
    // console.log("Event:",'dragstart');
  };
  var dragOver = function (e) {
    e.preventDefault();
    // console.log("Event:",'dragover');
  };
  var dragDrop = function () {
    const dragEndIndex = this.getAttribute("data-index");
    var dragEndTourId = this.parentElement.getAttribute("tourId");
    if (dragStartTourId === dragEndTourId) {
      swapSteps(dragStartTourId, dragStartIndex, dragEndIndex);
    }
    // this.classList.remove('over');
    // console.log("Event:",'drop');
  };
  var dragEnter = function () {
    // console.log("Event:",'dragenter');
    // this.classList.add('over');
  };
  var dragLeave = function () {
    // console.log("Event:",'dragleave');
    // this.classList.remove('over');
  };

  var ulElements = $("ul.inner");
  var draggableElements = $(".draggable");
  draggableElements.off("dragstart").on("dragstart", dragStart);
  ulElements.off("dragover").on("dragover", dragOver);
  ulElements.off("drop").on("drop", dragDrop);
  ulElements.off("dragenter").on("dragenter", dragEnter);
  ulElements.off("dragleave").on("dragleave", dragLeave);
};

var initiateAllEventListeners = async function () {
  toggleElementFunction();
  var accordionListElement = document.querySelector(AccordionListSelector);
  var formInputElement = document.querySelector(TourFormSelector);
  var createTourButton = document.querySelector(CreateTourButtonSelector);
  var tourNameElement = document.querySelector(TourFormNameSelector);
  var tourDescriptionElement = document.querySelector(
    TourFormDescriptionSelector
  );
  var loaderDiv = document.querySelector(LoaderDivElementSelector);
  /*TODO: Instead of getting tabId everyTime write create a method in background which on
  each tabchange/refresh/show events sends the tab details which we listen and store here.
  */
  var currentActiveTabId = undefined;

  //Generic Events  Start

  //CreateTourButton EventListener Start
  removeExistingEventListeners(CreateTourButtonSelector);
  var createTourButton = document.querySelector(CreateTourButtonSelector);
  createTourButton.addEventListener("click", function (e) {
    var parentElement = e.target.parentElement;
    tourNameElement.value = "";
    tourDescriptionElement.value = "";
    parentElement.style.display = "none";
    accordionListElement.style.display = "none";
    formInputElement.style.display = "flex";
  });
  //CreateTourButton EventListener End

  //CancelButton EventListener Start
  removeExistingEventListeners(TourFormCancelSelector);
  var cancelButton = document.querySelector(TourFormCancelSelector);
  cancelButton.addEventListener("click", function (e) {
    accordionListElement.style.display = "block";
    createTourButton.parentElement.style.display = "block";
    formInputElement.style.display = "none";
  });
  //CancelButton EventListener End

  //SaveButton EventListener Start
  removeExistingEventListeners(TourFormSaveSelector);
  var saveButton = document.querySelector(TourFormSaveSelector);
  saveButton.addEventListener("click", async function (e) {
    //tourId,tourName,tourDescription,tourUrl,isActive,tourHostName
    //Make the current tour as active in the storage, such that when we send the payload from site's ui we can identify to which object we need to append to
    var tourName = tourNameElement.value;
    var tourDescription = tourDescriptionElement.value;
    var tourId = getRandomId();
    var isActive = true;
    const activeTab = await getCurrentTab();
    var urlObject = new URL(activeTab.url);
    //TODO: To store this in hashed manner later. This will be the key of our tourObj
    var tourHostName = urlObject.hostname;
    //Storing new tour object in chrome storage by sending this info to ContentScript which adds and returns the updated info
    var payload = {
      tourId: tourId,
      isActive: isActive,
      tourObj: {
        tourName: tourName,
        tourDescription: tourDescription,
        tourUrl: activeTab.url,
        tourHostName: tourHostName,
        steps: [],
      },
    };
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "NEW",
        payload: payload,
      },
      updateAccordionList
    );
  });
  //SaveButton EventListener End

  //UploadTourButton EventListener Start
  removeExistingEventListeners(UploadTourButtonSelector);
  removeExistingEventListeners(HiddenInputElementSelector);
  var uploadTourButton = document.querySelector(UploadTourButtonSelector);
  var hiddenInputFileElement = document.querySelector(
    HiddenInputElementSelector
  );
  uploadTourButton.addEventListener("click", async function (e) {
    console.log("Upload Tour Button event Listener Function");
    var currentActiveTab = await getCurrentTab();
    currentActiveTabId = currentActiveTab.id;
    hiddenInputFileElement.click();
    loaderDiv.style.display = "flex";
  });

  hiddenInputFileElement.addEventListener("change", function (e) {
    var clonedNode = e.target.cloneNode(true);
    console.log("Inside change event listener for hidden InputFileElement");
    console.log(e.target);
    e.target.value = "";
    if (
      !clonedNode.files.length ||
      !clonedNode.files[0].type === "application/json"
    ) {
      //TODO: Handle the error and show some message anywhere
      loaderDiv.style.display = "none";
    } else {
      clonedNode.files[0].text().then(
        async function (result) {
          var tourObject = JSON.parse(result);
          // const activeTab=await getCurrentTab();
          chrome.tabs.sendMessage(
            currentActiveTabId,
            {
              type: "NEW",
              payload: tourObject,
            },
            updateAccordionList
          );
        },
        function (error) {
          console.log("Some error in file processing");
          reject(error);
          window.close();
        }
      );
    }
  });
  //UploadTourButton EventListener End

  //Generic Events End

  //Tour Element Events Start

  //EditButton EventListener Start
  removeExistingEventListeners(TourEditButtonSelector);
  var tourEditButtons = document.querySelectorAll(TourEditButtonSelector);
  tourEditButtons.forEach(function (tourEditButton) {
    tourEditButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var currentTourId = parentElement.getAttribute("tourId");
      var tourElement = parentElement.parentElement;
      var tourContainer = tourElement.parentElement;
      var stepEditButtonsContainer=tourContainer.querySelector('.stepOrderButtonsContainer');
      if(stepEditButtonsContainer && stepEditButtonsContainer.style.display==='flex'){
        // updateAccordionList(allDataForHostName);
        stepEditButtonsContainer.style.display='none';
        tourContainer.style.border='none';
      }
      await createAndAppendTourEditElements(tourContainer, currentTourId);
      console.log("Inside Edit Tour Event Handler");
    });
  });

  //EditButton EventListener End

  //AddButton EventListener Start
  removeExistingEventListeners(TourAddButtonSelector);
  var tourAddButtons = document.querySelectorAll(TourAddButtonSelector);
  tourAddButtons.forEach(function (tourAddButton) {
    tourAddButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      /*
        This image logic is for when user clicks the image inside button due to event bubbling the button receives a click event but
        with targetElement as image, so we need to correct this to get the tourId 
        */
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var activeTourId = parentElement.getAttribute("tourId");
      const activeTab = await getCurrentTab();
      payload = {
        tourId: activeTourId,
      };
      chrome.tabs.sendMessage(
        activeTab.id,
        {
          type: "START",
          payload: payload,
        },
        updateAccordionList
      );
      window.close();
    });
  });
  //AddButton EventListener End

  //PresentButton EventListener Start
  removeExistingEventListeners(TourPresentButtonSelector);
  var tourPresentButtons = document.querySelectorAll(TourPresentButtonSelector);
  tourPresentButtons.forEach(function (tourPresentButton) {
    tourPresentButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var activeTourId = parentElement.getAttribute("tourId");
      const activeTab = await getCurrentTab();
      var urlObject = new URL(activeTab.url);
      //TODO: To store this in hashed manner later. This will be the key of our tourObj
      var tourHostName = urlObject.hostname;
      var payload = {
        tourId: activeTourId,
        tourObj: {
          tourHostName: tourHostName,
        },
      };
      chrome.tabs.sendMessage(activeTab.id, {
        type: "PRESENT",
        payload: payload,
      });
      window.close();
    });
  });

  //PresentButton EventListener End

  //DownloadButton EventListener Start
  removeExistingEventListeners(TourDownloadButtonSelector);
  var tourDownloadButtons = document.querySelectorAll(
    TourDownloadButtonSelector
  );
  tourDownloadButtons.forEach(function (tourDownloadButton) {
    tourDownloadButton.addEventListener("click", function (e) {
      var anchorElement = undefined;
      if (e.target.nodeName === "IMG") {
        anchorElement = e.target.nextElementSibling;
      } else {
        anchorElement = e.target.children[1];
      }
      anchorElement.click();
    });
  });
  //DownloadButton EventListener End

  //DeleteButton EventListener Start
  removeExistingEventListeners(TourDeleteButtonSelector);
  var tourDeleteButtons = document.querySelectorAll(TourDeleteButtonSelector);
  tourDeleteButtons.forEach(function (tourDeleteButton) {
    tourDeleteButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var activeTourId = parentElement.getAttribute("tourId");
      const activeTab = await getCurrentTab();
      var urlObject = new URL(activeTab.url);
      //TODO: To store this in hashed manner later. This will be the key of our tourObj
      var tourHostName = urlObject.hostname;
      var payload = {
        tourId: activeTourId,
        tourObj: {
          tourHostName: tourHostName,
        },
      };
      chrome.tabs.sendMessage(
        activeTab.id,
        {
          type: "DELETETOUR",
          payload: payload,
        },
        updateAccordionList
      );
    });
  });
  //DeleteButton EventListener End

  //Tour Element Events End

  //Step Element Events Start

  //EditButton EventListener Start
  removeExistingEventListeners(StepEditButtonSelector);
  var stepEditButtons = document.querySelectorAll(StepEditButtonSelector);
  stepEditButtons.forEach(function (stepEditButton) {
    stepEditButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var currentTourId = parentElement.getAttribute("parentTourId");
      var currentStepId = parentElement.getAttribute("stepId");
      var stepElement = parentElement.parentElement;
      var stepContainer = stepElement.parentElement;
      await createAndAppendStepEditElements(
        stepContainer,
        currentTourId,
        currentStepId
      );
      console.log("Inside Edit Step Event Handler");
    });
  });
  //EditButton EventListener End

  //PlayButton EventListener Start
  removeExistingEventListeners(StepPresentButtonSelector);
  var stepPresentButtons = document.querySelectorAll(StepPresentButtonSelector);
  stepPresentButtons.forEach(function (stepPresentButton) {
    stepPresentButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var currentTourId = parentElement.getAttribute("parentTourId");
      var currentStepId = parentElement.getAttribute("stepId");
      const activeTab = await getCurrentTab();
      var urlObject = new URL(activeTab.url);
      var tourHostName = urlObject.hostname;
      var payload = {
        tourId: currentTourId,
        tourObj: {
          tourHostName: tourHostName,
          playFrom: currentStepId,
        },
      };
      chrome.tabs.sendMessage(activeTab.id, {
        type: "PRESENT",
        payload: payload,
      });
      window.close();
    });
  });
  //PlayButton EventListener End

  //DeleteButton EventListener Start
  removeExistingEventListeners(StepDeleteButtonSelector);
  var stepDeleteButtons = document.querySelectorAll(StepDeleteButtonSelector);
  stepDeleteButtons.forEach(function (stepDeleteButton) {
    stepDeleteButton.addEventListener("click", async function (e) {
      var parentElement = e.target.parentElement;
      if (e.target.nodeName === "IMG") {
        parentElement = parentElement.parentElement;
      }
      var activeStepId = parentElement.getAttribute("stepId");
      var activeTourId = parentElement.getAttribute("parentTourId");
      const activeTab = await getCurrentTab();
      var urlObject = new URL(activeTab.url);
      //TODO: To store this in hashed manner later. This will be the key of our tourObj
      var tourHostName = urlObject.hostname;
      var payload = {
        tourId: activeTourId,
        tourObj: {
          tourHostName: tourHostName,
          steps: [{ stepId: activeStepId }],
        },
      };
      chrome.tabs.sendMessage(
        activeTab.id,
        {
          type: "DELETESTEP",
          payload: payload,
        },
        updateAccordionList
      );
    });
  });
  //DeleteButton EventListener End

  //Step Element Draggable Event Listeners Start
  addStepElementDragEventListeners();
  //Step Element Draggable Event Listeners End
  //Step Element Events End
};

var generateAndAppendTemplate = function () {
  //TourElement Template Addition
  var tourElementTemplate = document.createElement("template");
  tourElementTemplate.setAttribute("id", "TourElementTemplate");
  var tourElementDiv = document.createElement("div");
  tourElementDiv.setAttribute("class", "TourElement");
  var anchorElement = document.createElement("a");
  //To add text during runtime for this elem
  anchorElement.setAttribute("class", "toggle");
  anchorElement.setAttribute("id", "tourStepAnchor");
  anchorElement.setAttribute("href", "#");
  var buttonGroup = document.createElement("div");
  buttonGroup.setAttribute("class", "buttonGroupOuter");
  var editButtonElement0 = document.createElement("button");
  var addButtonElement0 = document.createElement("button");
  var playButtonElement0 = document.createElement("button");
  var deleteButtonElement0 = document.createElement("button");
  var downloadButtonElement0 = document.createElement("button");
  var downloadButtonAnchorElement0 = document.createElement("a");

  var editImgElement = document.createElement("img");
  editImgElement.src = "assets/EditIcon-16px.svg";
  editButtonElement0.appendChild(editImgElement);
  editButtonElement0.setAttribute("class", "editButton");
  editButtonElement0.setAttribute("title", "Edit the Tour Details");
  buttonGroup.appendChild(editButtonElement0);

  var addImgElement = document.createElement("img");
  addImgElement.src = "assets/AddIcon-16px.svg";
  addButtonElement0.appendChild(addImgElement);
  addButtonElement0.setAttribute("class", "addButton");
  addButtonElement0.setAttribute("title", "Add new Step to the Tour");
  buttonGroup.appendChild(addButtonElement0);

  var slideShowImgElement = document.createElement("img");
  slideShowImgElement.src = "assets/SlideshowIcon-16px.svg";
  playButtonElement0.appendChild(slideShowImgElement);
  playButtonElement0.setAttribute("class", "playButton");
  playButtonElement0.setAttribute("title", "Play the Tour");
  buttonGroup.appendChild(playButtonElement0);

  var downloadImgElement = document.createElement("img");
  downloadImgElement.src = "assets/DownloadIcon-16px.svg";
  downloadButtonElement0.appendChild(downloadImgElement);
  downloadButtonElement0.setAttribute("title", "Download Tour");
  downloadButtonElement0.setAttribute("class", "downloadTourButton");
  downloadButtonElement0.setAttribute("title", "Download the Tour");
  downloadButtonElement0.appendChild(downloadButtonAnchorElement0);
  buttonGroup.appendChild(downloadButtonElement0);

  var deleteImgElement = document.createElement("img");
  deleteImgElement.src = "assets/DeleteIcon-16px.svg";
  deleteButtonElement0.appendChild(deleteImgElement);
  deleteButtonElement0.setAttribute("class", "deleteButton");
  deleteButtonElement0.setAttribute("title", "Delete the Tour");
  buttonGroup.appendChild(deleteButtonElement0);

  tourElementDiv.appendChild(anchorElement);
  tourElementDiv.appendChild(buttonGroup);
  tourElementTemplate.content.appendChild(tourElementDiv);
  document.body.appendChild(tourElementTemplate);

  //StepOrderButtons Container Template Addition Start
  var stepOrderButtonsTemplate=document.createElement('template');
  stepOrderButtonsTemplate.setAttribute("id","StepOrderButtonsTemplate");
  var divElement=document.createElement('div');
  divElement.classList.add('stepOrderButtonsContainer');
  var updateButton=document.createElement('button');
  updateButton.classList.add('update');
  updateButton.textContent='Update';
  var cancelButton=document.createElement('button');
  cancelButton.classList.add('cancel');
  cancelButton.textContent='Cancel';
  divElement.appendChild(updateButton);
  divElement.appendChild(cancelButton);
  stepOrderButtonsTemplate.content.appendChild(divElement);
  document.body.appendChild(stepOrderButtonsTemplate);
  //StepOrderButtons Container Template Addition End
 
  //StepElement Template Addition
  var stepElementTemplate = document.createElement("template");
  stepElementTemplate.setAttribute("id", "StepElementTemplate");
  var listElement = document.createElement("li");
  listElement.setAttribute("draggable", true);
  listElement.classList.add("draggable");
  var stepElement = document.createElement("div");
  stepElement.setAttribute("class", "StepElement");
  var stepTextElement = document.createElement("div");
  stepTextElement.setAttribute("class", "StepText");
  var buttonGroupInnerElement = document.createElement("div");
  buttonGroupInnerElement.setAttribute("class", "buttonGroupInner");
  var editButtonElement = document.createElement("button");
  var playButtonElement = document.createElement("button");
  var deleteButtonElement = document.createElement("button");

  var editImgElement = document.createElement("img");
  editImgElement.src = "assets/EditIcon-12px.svg";
  editButtonElement.appendChild(editImgElement);
  editButtonElement.setAttribute("class", "editButton");
  editButtonElement.setAttribute("title", "Edit the Step Details");
  buttonGroupInnerElement.appendChild(editButtonElement);

  var slideShowImgElement = document.createElement("img");
  slideShowImgElement.src = "assets/SlideshowIcon-12px.svg";
  playButtonElement.appendChild(slideShowImgElement);
  playButtonElement.setAttribute("class", "playButton");
  playButtonElement.setAttribute("title", "Play Tour from this Step");
  buttonGroupInnerElement.appendChild(playButtonElement);

  var deleteImgElement = document.createElement("img");
  deleteImgElement.src = "assets/DeleteIcon-12px.svg";
  deleteButtonElement.appendChild(deleteImgElement);
  deleteButtonElement.setAttribute("class", "deleteButton");
  deleteButtonElement.setAttribute("title", "Delete the Step");
  buttonGroupInnerElement.appendChild(deleteButtonElement);

  stepElement.appendChild(stepTextElement);
  stepElement.appendChild(buttonGroupInnerElement);
  listElement.appendChild(stepElement);
  stepElementTemplate.content.appendChild(listElement);
  document.body.appendChild(stepElementTemplate);

  //TourEdit  Template Start
  var tourEditTemplate = document.createElement("template");
  tourEditTemplate.setAttribute("id", "tourEditTemplate");
  var tourEditElement = document.createElement("div");
  tourEditElement.setAttribute("class", "tourEdit");
  var tourNameLabel = document.createElement("label");
  tourNameLabel.innerText = "TourName:";
  var breakElement = document.createElement("br");
  tourNameLabel.appendChild(breakElement);
  var tourNameInput = document.createElement("input");
  tourNameInput.setAttribute("maxlength", "50");
  tourNameLabel.appendChild(tourNameInput);
  tourEditElement.appendChild(tourNameLabel);
  var tourDescriptionLabel = document.createElement("label");
  tourDescriptionLabel.innerText = "TourDescription:";
  tourDescriptionLabel.appendChild(breakElement.cloneNode(true));
  var tourDescriptionTextArea = document.createElement("textarea");
  tourDescriptionTextArea.setAttribute("maxlength", "500");
  tourDescriptionLabel.appendChild(tourDescriptionTextArea);
  tourEditElement.appendChild(tourDescriptionLabel);
  var tourEditButtonsContainer = document.createElement("div");
  tourEditButtonsContainer.setAttribute("class", "tourEditButtonsContainer");
  var tourEditUpdateButton = document.createElement("button");
  tourEditUpdateButton.textContent = "Update";
  tourEditUpdateButton.setAttribute("class", "tourEditUpdateButton");
  var tourEditCancelButton = document.createElement("button");
  tourEditCancelButton.textContent = "Cancel";
  tourEditCancelButton.setAttribute("class", "tourEditCancelButton");
  tourEditButtonsContainer.appendChild(tourEditCancelButton);
  tourEditButtonsContainer.appendChild(tourEditUpdateButton);
  tourEditElement.appendChild(tourEditButtonsContainer);
  tourEditTemplate.content.appendChild(tourEditElement);
  document.body.appendChild(tourEditTemplate);
  //TourEdit Template End

  //StepEdit Template Start
  var stepEditTemplate = document.createElement("template");
  stepEditTemplate.setAttribute("id", "stepEditTemplate");
  var stepEditElement = document.createElement("div");
  stepEditElement.setAttribute("class", "stepEdit");
  var breakElement = document.createElement("br");
  var stepNameLabel = document.createElement("label");
  stepNameLabel.innerText = "StepName: ";
  stepNameLabel.setAttribute("class", "stepNameLabel");
  stepNameLabel.appendChild(breakElement.cloneNode(true));
  var stepNameInput = document.createElement("input");
  stepNameInput.setAttribute("maxlength", "50");
  stepNameLabel.appendChild(stepNameInput);
  stepEditElement.appendChild(stepNameLabel);

  var stepDescriptionLabel = document.createElement("label");
  stepDescriptionLabel.innerText = "StepDescription:";
  stepDescriptionLabel.setAttribute("class", "stepDescriptionLabel");
  stepDescriptionLabel.appendChild(breakElement.cloneNode(true));
  var stepDescriptionTextArea = document.createElement("textarea");
  stepDescriptionTextArea.setAttribute("maxlength", "100");
  stepDescriptionLabel.appendChild(stepDescriptionTextArea);
  stepEditElement.appendChild(stepDescriptionLabel);

  var stepSelectorLabel = document.createElement("label");
  stepSelectorLabel.innerText = "StepElement Selector:";
  stepSelectorLabel.setAttribute("class", "stepSelectorLabel");
  stepSelectorLabel.appendChild(breakElement.cloneNode(true));
  var stepSelectorTextArea = document.createElement("textarea");
  stepSelectorLabel.appendChild(stepSelectorTextArea);
  stepEditElement.appendChild(stepSelectorLabel);

  var stepEventLabel = document.createElement("label");
  stepEventLabel.innerText = "StepEvent:";
  stepEventLabel.setAttribute("class", "stepEventLabel");
  stepEventLabel.appendChild(breakElement.cloneNode());
  var stepEventInput = document.createElement("input");
  stepEventLabel.appendChild(stepEventInput);
  stepEditElement.appendChild(stepEventLabel);

  var stepEditButtonsContainer = document.createElement("div");
  stepEditButtonsContainer.setAttribute("class", "stepEditButtonsContainer");
  var stepEditUpdateButton = document.createElement("button");
  stepEditUpdateButton.textContent = "Update";
  stepEditUpdateButton.setAttribute("class", "stepEditUpdateButton");
  var stepEditCancelButton = document.createElement("button");
  stepEditCancelButton.textContent = "Cancel";
  stepEditCancelButton.setAttribute("class", "stepEditCancelButton");
  stepEditButtonsContainer.appendChild(stepEditCancelButton);
  stepEditButtonsContainer.appendChild(stepEditUpdateButton);
  stepEditElement.appendChild(stepEditButtonsContainer);

  stepEditTemplate.content.appendChild(stepEditElement);
  document.body.appendChild(stepEditTemplate);
  //StepEdit Template End
};

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    // get the cta button element
    generateAndAppendTemplate();

    //Fetch and show the data during startload
    const activeTab = await getCurrentTab();
    var urlObject = new URL(activeTab.url);
    //TODO: To store this in hashed manner later. This will be the key of our tourObj
    var tourHostName = urlObject.hostname;
    chrome.tabs.sendMessage(
      activeTab.id,
      {
        type: "GET",
        payload: {
          tourObj: {
            tourHostName: tourHostName,
          },
        },
      },
      updateAccordionList
    );

    // handle cta button click event
    // to be able to start inspection
    // selectElementButton.addEventListener('click', function () {

    //   // send the message to start inspection
    //   chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //     chrome.tabs.sendMessage(tabs[0].id, {data: null})
    //   })

    //   // close the extension popup
    //   window.close()

    // }, false)
  },
  false
);
