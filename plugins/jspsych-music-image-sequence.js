/**
 * jspsych-music-image-sequence
 * Petr Janata 18Sep2022
 *
 * plugin for presenting multiple frames of images (and accompanying text)
 * in a sequence while an auditory stimulus plays in the background
 *
 * 
 *
 **/


jsPsych.plugins["music-image-sequence"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('music-image-sequence', 'stimulus', 'audio');

  plugin.info = {
    name: 'music-image-sequence',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The audio to be played.'
      },

      frames: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Frames',
        default: undefined,
        array: true,
        description: 'The list of frames containing information to be displayed in sequence'
      },

      format: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Display format',
        default: 'slideshow',
        description: 'Whether frames should be displayed in a temporal sequence (slideshow) [default] or arranged as a comic strip (comicstrip)',
      },

      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        array: true,
        default: jsPsych.ALL_KEYS,
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },

      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the stimulus.'
      },

      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'The maximum duration to wait for a response.'
      },

      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, the trial will end when user makes a response.'
      },

      trial_ends_after_audio: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Trial ends after audio',
        default: false,
        description: 'If true, then the trial will end as soon as the audio file finishes playing.'
      },

      displayQuestionsAtStart: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'questions at start',
        default: false,
        description: 'If true, display pyensemble questions at start of trial.'
      },

      click_to_start: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button to start sound',
        default: true,
        description: 'If true, requires button click for trial to start.'
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    var audio;

    // store response
    var trial_data = {
        "sound": trial.stimulus.replace(/^.*[\\\/]/, ''),
        "picture": trial.frames[0].image[0].replace(/^.*[\\\/]/, ''),
      };

    // record webaudio context start time
    var startTime;

    // load audio file
    jsPsych.pluginAPI.getAudioBuffer(trial.stimulus)
      .then(function (buffer) {
        if (context !== null) {
          audio = context.createBufferSource();
          audio.buffer = buffer;
          audio.connect(context.destination);
        } else {
          audio = buffer;
          audio.currentTime = 0;
        }
        setupTrial();
      })
      .catch(function (err) {
        console.error(`Failed to load audio file "${trial.stimulus}". Try checking the file path. We recommend using the preload plugin to load audio files.`)
        console.error(err)
      });

    function setupTrial() {
      // set up end event if trial needs it
      if (trial.trial_ends_after_audio) {
        audio.addEventListener('ended', end_trial);
      }

      // Preload all our images
      for (var f=0; f < trial.frames.length; f++){
        for (var i=0; i < trial.frames[f].image.length; i++){
          html = '<div class="d-none"><img src="'+trial.frames[f].image[i]+'"></img></div>';
          display_element.innerHTML = html;
        }
      }

      // show prompt if there is one
      if (trial.prompt !== null) {
        display_element.innerHTML = trial.prompt;
      }

      /////////////////////////////////
      // Either start the trial or wait for the user to click start
      if(!trial.click_to_start || context==null){
        start_audio();
      } else {
        // Register callback for start sound button if we have one
        $('#start_button').on('click', function(ev){
          ev.preventDefault();

          // Fix for Firefox not blurring the button
          if (document.activeElement == this){
            jsPsych.getDisplayContainerElement().focus();
          }

          start_audio();
        })
      }
    }

    // function to end trial when it is time
    function end_trial() {
      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      if (context !== null) {
        audio.stop();
      } else {
        audio.pause();
      }

      audio.removeEventListener('ended', end_trial);

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

    function set_style(html=""){
      // Load our css if we have it
      if (trial.css) {
        html += '<style>'+trial.css+'</style>';
      }

      return html
    }

    // Frame-generating function
    function create_frame(frame){
      let html = '';
      
      html += '<div class="frame col border">';
      html += '<div class="row">';
      
      for (var img=0; img < frame.image.length; img++){
        html += '<div class="col-12">'
        html += '<img src="'+frame.image[img]+'" id="jspsych-music-image-sequence'+img.toString()+'"></img>';
        html +='</div>'; // col
      }

      html += '</div>'; // row
      if (frame.text){
        html += frame.text;
      }

      html += '</div>'; // col; end of frame  
      
      return html   
    }

    // Create our functions for presenting a sequence of frames
    function present_slideshow(){
      var wait_time = 0;
      var wait_int = trial.frame_interval_ms;
      var current_frame = 0;

      // Callback function to show the current frame
      function show_slideshow_frame(){
        let html = set_style();

        // Grab the current frame
        html += create_frame(trial.frames[current_frame]);

        // Show it
        display_element.innerHTML = html

        current_frame = (current_frame < trial.frames.length-1) ? current_frame+1 : 0;
      }  

      // Loop over iterations of the slideshow
      for (let i=0; i<trial.num_sequence_iterations; i++){
        // Loop over frames
        for (let f=0; f<trial.frames.length; f++){
          jsPsych.pluginAPI.setTimeout(show_slideshow_frame, startTime+wait_time);
          wait_time += wait_int;
        }
      }

    };

    function present_comicstrip(){
      var html = set_style();

      // start of row of frames
      html += '<div class="comicstrip row my-5">'; 

      for (let iframe=0; iframe < trial.frames.length; iframe++){
        frame = trial.frames[iframe]

        html += create_frame(frame);
      }

      html +='</div>'; // end of row of frames

      // show the frame
      display_element.innerHTML = html;
    }

    // Embed the rest of the trial into a function so that we can attach to a button if desired
    function start_audio(){
      // start audio
      if (context !== null) {
        startTime = context.currentTime;
        audio.start(startTime);
      } else {
        audio.play();
      }

      // end trial if time limit is set
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(function() {
          end_trial();
        }, trial.trial_duration);
      }

      // Present our stimuli
      if (trial.format == 'slideshow'){
        jsPsych.pluginAPI.setTimeout(present_slideshow, 0);
      } else if (trial.format == 'comicstrip'){
        jsPsych.pluginAPI.setTimeout(present_comicstrip, 0);
      }

      if(trial.displayQuestionsAtStart) {
              $("#questions").removeClass("d-none");
              $("#questions .form-actions input").attr({'disabled':true})
      
      }
    }
  };

  return plugin;
})();
