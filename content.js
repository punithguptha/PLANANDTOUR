(() => {
  // configure theRoom
  window.theRoom.configure({
    blockRedirection: true,
    createInspector: true,
    excludes: [],
    click: function (element, event) {
      debugger;
      event.preventDefault();
      event.stopPropagation();
      // get the unique css selector of the clicked element
      // and then copy it to clipboard
      navigator.clipboard.writeText(getSelector(element)).then(
        function () {
          alert("The unique CSS selector successfully copied to clipboard");
        },
        function (err) {
          alert("The unique CSS selector could not be copied to clipboard");
        }
      );

      // so far so good
      // stop inspection
      window.theRoom.stop(true);
    },
    keydown: function (element, event) {
      // console.log("Inside keydown function in content.js");
      // console.log("Element Selected" + getSelector(element));
      var swalTemplateElement = document.getElementById("SwalTemplate");
      var swalTemplateContentCloned =
        swalTemplateElement.content.firstElementChild.cloneNode(true);
      var defaultSelector = getSelector(element);
      Swal.fire({
        html: swalTemplateContentCloned,
        showCloseButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: "Save",
        willOpen: function (element) {
          window.theRoom.stop(true);
          var o9SplitViewElement = document.getElementById("__splitview__");
          if (o9SplitViewElement) {
            o9SplitViewElement.style.position = "fixed";
          }
        },
        willClose: function (element) {
          var o9SplitViewElement = document.getElementById("__splitview__");
          if (o9SplitViewElement) {
            o9SplitViewElement.style.position = "";
          }
        },
        preConfirm: function () {
          //To get the element's input values and storing them before swal closes by confirm button
          var nameInputValue = document.querySelector(
            ".nameInput.swal2-input"
          )?.value;
          var selectorElementInputValue = document.querySelector(
            ".selectorElementInput.swal2-input"
          )?.value;
          var contentInputValue = document.querySelector(
            ".contentInput.swal2-textarea"
          )?.value;
          var eventTypeInputValue = document.querySelector(
            ".eventTypeInput.swal2-input"
          )?.value;
          return [
            nameInputValue,
            selectorElementInputValue,
            contentInputValue,
            eventTypeInputValue,
          ];
        },
      }).then(function (result) {
        if (result?.value) {
          //stepNumber to be added during runtime by comparing the storage's length
          var stepName, stepElementPath, stepDescription, stepEvent, stepUrl;
          [stepName, stepElementPath, stepDescription, stepEvent] =
            result.value;
          stepUrl = window.location.href;
          var urlObject = new URL(stepUrl);
          var hostName = urlObject.hostname;
          stepElementPath = stepElementPath ? stepElementPath : defaultSelector;
          var stepPayload = {
            stepName: stepName,
            stepEvent: stepEvent,
            stepElementPath: stepElementPath,
            stepUrl: stepUrl,
            stepDescription: stepDescription,
          };
          addStepData(hostName, stepPayload);
        }
        window.theRoom.start();
      });

      // so far so good
      // stop inspection
      // window.theRoom.stop(true);
    },
  });

  //Global vars
  var activeTourId = undefined;

  var getRandomId = function () {
    return crypto.randomUUID();
  };

  var generateAndAppendTemplate = function () {
    //SwalTemplate Addition
    var swalTemplateElement = document.createElement("template");
    swalTemplateElement.setAttribute("id", "SwalTemplate");
    var MainDiv = document.createElement("div");
    MainDiv.setAttribute("class", "MainDiv");

    var nameElement = document.createElement("input");
    nameElement.setAttribute("class", "nameInput swal2-input");
    nameElement.setAttribute("placeholder", "Enter a name");
    nameElement.setAttribute("maxlength", "50");

    var selectorInputElement = document.createElement("input");
    selectorInputElement.setAttribute(
      "class",
      "selectorElementInput swal2-input"
    );
    selectorInputElement.setAttribute(
      "placeholder",
      "Optional element selector"
    );

    var contentInputElement = document.createElement("textarea");
    contentInputElement.setAttribute("class", "contentInput swal2-textarea");
    contentInputElement.setAttribute("placeholder", "Enter the text for tour");
    contentInputElement.setAttribute("maxlength", "100");

    var eventTypeInputElement = document.createElement("input");
    eventTypeInputElement.setAttribute("class", "eventTypeInput swal2-input");
    eventTypeInputElement.setAttribute("placeholder", "Event Type During tour");

    MainDiv.appendChild(nameElement);
    MainDiv.appendChild(contentInputElement);
    MainDiv.appendChild(selectorInputElement);
    MainDiv.appendChild(eventTypeInputElement);

    swalTemplateElement.content.appendChild(MainDiv);

    document.body.appendChild(swalTemplateElement);
  };

  var fetchData = function (currentHostName) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([currentHostName], function (obj) {
        resolve(obj[currentHostName] ? JSON.parse(obj[currentHostName]) : []);
      });
    });
  };

  var addStepData = async function (currentHostName, stepPayload) {
    var allDataForHostName = await fetchData(currentHostName);
    stepPayload.stepNumber = "";
    stepPayload.stepId = getRandomId();
    var passedStepName = stepPayload.stepName;
    var passedStepDescription = stepPayload.stepDescription;
    //Filter our for items with activeTourId
    for (var i = 0; i < allDataForHostName.length; i++) {
      var currentTourObject = allDataForHostName[i];
      if (currentTourObject.tourId === activeTourId) {
        var currentTourObjectSteps = currentTourObject.tourObj.steps;
        stepPayload.stepNumber = currentTourObjectSteps.length + 1;
        var defaultStepName = "DefaultStepName";
        var defaultStepDescription = "DefaultStepDescription";
        stepPayload.stepName = passedStepName
          ? passedStepName
          : defaultStepName;
        stepPayload.stepDescription = passedStepDescription
          ? passedStepDescription
          : defaultStepDescription;
        currentTourObject.tourObj.steps = [
          ...currentTourObjectSteps,
          stepPayload,
        ];
        allDataForHostName[i] = currentTourObject;
        chrome.storage.sync.set({
          [currentHostName]: JSON.stringify(allDataForHostName),
        });
        break;
      }
    }
    console.log("Updated Data from addStepData method below for current Tour:");
    console.log(currentTourObject);
  };

  var destroyShepherdInstances = function () {
    Shepherd.activeTour?.steps?.forEach((item) => {
      item.destroy();
    });
  };

  var convertPayloadToShepherdAndRun = function (currentTourObject, playFrom) {
    destroyShepherdInstances();
    var steps = currentTourObject.tourObj.steps;
    if (playFrom) {
      var stepIndexToPlayFrom = steps.findIndex(function (step) {
        if (step.stepId === playFrom) {
          return true;
        }
        return false;
      });
      steps = steps.slice(stepIndexToPlayFrom, steps.length);
    }
    const tour = new Shepherd.Tour({
      tourName: currentTourObject.tourObj.tourName,
      useModalOverlay: true,
      defaultStepOptions: {
        classes: "shadow-md bg-purple-dark",
        scrollTo: { behavior: "smooth", block: "center" },
        cancelIcon: {
          enabled: true,
          label: "Close",
        },
      },
    });
    for (var i = 0; i < steps.length; i++) {
      let intervalId;
      var currentStep = steps[i];
      var stepOptions = {
        text: currentStep.stepDescription,
        title: currentStep.stepName,
        eventType: currentStep.stepEvent,
        attachTo: {
          element: currentStep.stepElementPath,
          on: "auto",
        },
        buttons: [
          {
            text: "Previous",
            action: tour.back,
          },
          {
            text: "Next",
            action: tour.next,
          },
        ],
        beforeShowPromise: function () {
          return new Promise(function (resolve, reject) {
            var count = 0;
            var max_count = 10;
            var currentStepOptions = this.options;
            //Try to find the element till max attempts and then reject the promise with some error
            intervalId = setInterval(
              function () {
                console.log("Current count inside beforeShowPromise: " + count);
                console.log(currentStepOptions);
                if (
                  count !== max_count &&
                  $(
                    this.Shepherd.activeTour.currentStep.options.attachTo
                      .element
                  )[0]
                ) {
                  resolve(
                    $(
                      this.Shepherd.activeTour.currentStep.options.attachTo
                        .element
                    )
                  );
                } else if (count === max_count) {
                  console.log(
                    "Max number of attempts reached in finding the element!!!"
                  );
                  resolve(
                    "Max number of attempts reached in finding the element!!!"
                  );
                }
                count = count + 1;
              },
              500,
              count,
              currentStepOptions
            );
          });
        },
        when: {
          show: function () {
            clearInterval(intervalId);
            var selectorElement = $(this.options.attachTo.element);
            if (!selectorElement[0]) {
              console.log(
                "Current selector is not working..So ending the tour!"
              );
              tour.complete();
            } else if (this.options.eventType === "click") {
              selectorElement.off("click").on("click", function () {
                tour.next();
              });
            }
          },
        },
      };
      if (currentStep.stepEvent && currentStep.stepEvent === "click") {
        stepOptions.buttons = false;
      }
      tour.addStep(stepOptions);
    }
    tour.start();
  };

  // inspector element styles
  var linkElement = document.createElement("link");
  linkElement.setAttribute("rel", "stylesheet");
  linkElement.setAttribute("type", "text/css");
  linkElement.setAttribute(
    "href",
    "data:text/css;charset=UTF-8," +
      encodeURIComponent(
        ".inspector-element { position: absolute; pointer-events: none; border: 2px solid tomato; transition: all 200ms; background-color: rgba(180, 187, 105, 0.2); z-index:2147483644 }"
      )
  );
  document.head.appendChild(linkElement);

  //Creation of Modal Template Element and appending it to body
  generateAndAppendTemplate();

  var handleEvents = async function (object, sender, sendResponse) {
    var { type, payload } = object;
    var tourHostName = payload?.tourObj?.tourHostName;
    var allDataForHostName = await fetchData(tourHostName);
    var responseData = undefined;
    if (type === "NEW" && tourHostName) {
      activeTourId = payload.tourId;
      var passedTourName = payload.tourObj.tourName;
      var passedTourDescription = payload.tourObj.tourDescription;
      var defaultTourName = "DefaultTourName";
      var defaultTourDescription = "DefaultTourDescription";
      payload.tourObj.tourName = passedTourName
        ? passedTourName
        : defaultTourName;
      payload.tourObj.tourDescription = passedTourDescription
        ? passedTourDescription
        : defaultTourDescription;
      //Filter out if there are any existing tour Elements with this newly passed tourId(can happen during upload flow)
      allDataForHostName = allDataForHostName.filter(function (item) {
        return item.tourId != activeTourId;
      });
      allDataForHostName = [...allDataForHostName, payload];
      chrome.storage.sync.set({
        [tourHostName]: JSON.stringify(allDataForHostName),
      });
      //Even if some other domain's payload is uploaded from current domains extension popup, we should be sending the current domains response only
      var currentURL = window.location.href;
      var urlObject = new URL(currentURL);
      var currentHostName = urlObject.hostname;
      allDataForHostName = await fetchData(currentHostName);
      responseData = allDataForHostName;
    } else if (type === "GET" && tourHostName) {
      responseData = allDataForHostName;
    } else if (type === "GETTOUR" && tourHostName) {
      activeTourId = payload.tourId;
      var passedTourId = payload.tourId;
      responseData = allDataForHostName.filter(function (tour) {
        return tour.tourId === passedTourId;
      })[0];
    } else if (type === "GETSTEP" && tourHostName) {
      activeTourId = payload.tourId;
      var passedTourId = payload.tourId;
      var passedStepId = payload.tourObj.steps[0].stepId;
      var filteredTourObj = allDataForHostName.filter(function (tour) {
        return tour.tourId === passedTourId;
      })[0];
      var filteredStepObj = filteredTourObj.tourObj.steps.filter(function (
        step
      ) {
        return step.stepId === passedStepId;
      })[0];
      responseData = filteredStepObj;
    } else if (type === "DELETETOUR" && tourHostName) {
      var passedTourId = payload.tourId;
      //Filter out with the passed tourId and remove it from storage
      for (var i = 0; i < allDataForHostName.length; i++) {
        var currentTourObject = allDataForHostName[i];
        if (currentTourObject.tourId === passedTourId) {
          allDataForHostName = allDataForHostName.filter(function (item) {
            return item !== currentTourObject;
          });
          responseData = allDataForHostName;
          chrome.storage.sync.set({
            [tourHostName]: JSON.stringify(allDataForHostName),
          });
          break;
        }
      }
    } else if (type === "DELETESTEP" && tourHostName) {
      activeTourId = payload.tourId;
      var passedTourId = payload.tourId;
      var passedStepId = payload?.tourObj?.steps[0]?.stepId;
      for (var i = 0; i < allDataForHostName.length; i++) {
        var currentTourObject = allDataForHostName[i];
        if (currentTourObject.tourId === passedTourId) {
          var currentTourObjectSteps = currentTourObject.tourObj.steps;
          var filteredSteps = currentTourObjectSteps.filter(function (item) {
            return item.stepId !== passedStepId;
          });
          currentTourObject.tourObj.steps = filteredSteps;
          allDataForHostName[i] = currentTourObject;
          responseData = allDataForHostName;
          chrome.storage.sync.set({
            [tourHostName]: JSON.stringify(allDataForHostName),
          });
          break;
        }
      }
    } else if (type === "PRESENT" && tourHostName) {
      activeTourId = payload.tourId;
      passedTourId = payload.tourId;
      var playFrom = payload?.tourObj?.playFrom; //If not sent it will take value as undefined
      for (var i = 0; i < allDataForHostName.length; i++) {
        var currentTourObject = allDataForHostName[i];
        if (currentTourObject.tourId === passedTourId) {
          convertPayloadToShepherdAndRun(currentTourObject, playFrom);
          break;
        }
      }
    } else if (type === "UPDATETOUR" && tourHostName) {
      activeTourId = payload.tourId;
      passedTourId = payload.tourId;
      var currentTourObject = allDataForHostName.filter(function (tour) {
        return tour.tourId === passedTourId;
      })[0];
      if (payload.tourObj.tourName) {
        currentTourObject.tourObj.tourName = payload.tourObj.tourName;
      }
      if (payload.tourObj.tourDescription) {
        currentTourObject.tourObj.tourDescription =
          payload.tourObj.tourDescription;
      }
      var currentTourIndex = allDataForHostName.findIndex(function (tour) {
        if (tour.tourId === passedTourId) {
          return true;
        }
        return false;
      });
      allDataForHostName[currentTourIndex] = currentTourObject;
      responseData = allDataForHostName;
      chrome.storage.sync.set({
        [tourHostName]: JSON.stringify(allDataForHostName),
      });
    } else if (type === "UPDATESTEP" && tourHostName) {
      activeTourId = payload.tourId;
      passedTourId = payload.tourId;
      var passedStep = payload.tourObj.steps[0];
      var passedStepId = passedStep.stepId;
      var currentTourObject = allDataForHostName.filter(function (tour) {
        return tour.tourId === passedTourId;
      })[0];
      var currentStepObj = currentTourObject.tourObj.steps.filter(function (
        step
      ) {
        return step.stepId === passedStepId;
      })[0];
      var currentTourIndex = allDataForHostName.findIndex(function (tour) {
        if (tour.tourId === passedTourId) {
          return true;
        }
        return false;
      });
      var currentStepIndex = currentTourObject.tourObj.steps.findIndex(
        function (step) {
          if (step.stepId === passedStepId) {
            return true;
          }
          return false;
        }
      );

      //Updating values of step with passed ones
      if (passedStep.stepName) {
        currentStepObj.stepName = passedStep.stepName;
      }
      if (passedStep.stepDescription) {
        currentStepObj.stepDescription = passedStep.stepDescription;
      }
      if (passedStep.stepElementPath) {
        currentStepObj.stepElementPath = passedStep.stepElementPath;
      }
      if (passedStep.stepEvent) {
        currentStepObj.stepEvent = passedStep.stepEvent;
      }
      currentTourObject.tourObj.steps[currentStepIndex] = currentStepObj;
      allDataForHostName[currentTourIndex] = currentTourObject;
      chrome.storage.sync.set({
        [tourHostName]: JSON.stringify(allDataForHostName),
      });
      responseData = allDataForHostName;
    }else if(type==="UPDATESTEPORDER" && tourHostName){
      activeTourId=payload.tourId;
      var passedTourId=payload.tourId;
      var currentTourIndex=allDataForHostName.findIndex(function(tour){
        if(tour.tourId===passedTourId){
          return true;
        }
        return false;
      });
      var newTourObject=JSON.parse(JSON.stringify(allDataForHostName[currentTourIndex]));
      newTourObject.tourObj.steps=[];
      var passedStepsOrder=payload.tourObj.steps;
      passedStepsOrder.forEach(function(passedStep){
        var stepId=passedStep.stepId;
        var fullStepData=allDataForHostName[currentTourIndex].tourObj.steps.filter(function(step){
          return step.stepId===stepId;
        })[0];
        newTourObject.tourObj.steps.push(fullStepData);
      });
      allDataForHostName[currentTourIndex]=newTourObject;
      chrome.storage.sync.set({
        [tourHostName]: JSON.stringify(allDataForHostName),
      });
      responseData=allDataForHostName;
    }
    if (sendResponse) {
      sendResponse(responseData);
    }
  };

  chrome.runtime.onMessage.addListener(function (object, sender, sendResponse) {
    // the expected message has arrived
    // ready to start inspection
    var { type, payload } = object;
    if (type === "START") {
      activeTourId = payload.tourId;
      // inspection has started
      window.theRoom.start();
    } else {
      handleEvents(object, sender, sendResponse);
      return true;
    }
  });
})();
