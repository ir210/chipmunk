// Copyright (c) 2019 ESR Labs. All rights reserved.
//
// NOTICE:  All information contained herein is, and remains
// the property of ESR Labs and its suppliers, if any.
// The intellectual and technical concepts contained herein are
// proprietary to ESR Labs and its suppliers and may be covered
// by German and Foreign Patents, patents in process, and are protected
// by trade secret or copyright law.
// Dissemination of this information or reproduction of this material
// is strictly forbidden unless prior written permission is obtained
// from ESR Labs.

use crate::channels::{EventEmitterTask, IndexingThreadConfig};

use indexer_base::chunks::ChunkResults;
use indexer_base::config::IndexingConfig;
use neon::prelude::*;
use std::fs;
use std::path;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;

pub struct IndexingAdbEventEmitter {
    pub event_receiver: Arc<Mutex<mpsc::Receiver<ChunkResults>>>,
    pub shutdown_sender: mpsc::Sender<()>,
    pub task_thread: Option<std::thread::JoinHandle<()>>,
}

impl IndexingAdbEventEmitter {
    pub fn start_indexing_adb_in_thread(
        self: &mut IndexingAdbEventEmitter,
        shutdown_rx: mpsc::Receiver<()>,
        chunk_result_sender: mpsc::Sender<ChunkResults>,
        chunk_size: usize,
        thread_conf: IndexingThreadConfig,
        filter_conf: Option<adb::filtering::AdbFilterConfig>,
    ) {
        info!("start_indexing_adb_in_thread: {:?}", thread_conf);

        self.task_thread = Some(thread::spawn(move || {
            index_adb_file_with_progress(
                IndexingConfig {
                    tag: thread_conf.tag.as_str(),
                    chunk_size,
                    in_file: thread_conf.in_file,
                    out_path: &thread_conf.out_path,
                    append: thread_conf.append,
                },
                filter_conf,
                chunk_result_sender.clone(),
                Some(shutdown_rx),
            );
            debug!("back after ADB indexing finished!");
        }));
    }
}

fn index_adb_file_with_progress(
    config: IndexingConfig,
    filter_conf: Option<adb::filtering::AdbFilterConfig>,
    tx: mpsc::Sender<ChunkResults>,
    shutdown_receiver: Option<mpsc::Receiver<()>>,
) {
    trace!("index_adb_file_with_progress");
    let source_file_size = Some(match config.in_file.metadata() {
        Ok(file_meta) => file_meta.len() as usize,
        Err(_) => {
            error!("could not find out size of source file");
            std::process::exit(2);
        }
    });

    /*
    match adb::adb_parse::create_index_and_mapping_adb(
        config,
        source_file_size,
        tx,
        shutdown_receiver,
    ) {
        Err(why) => {
            error!("couldn't process: {}", why);
            std::process::exit(2);
        }
        Ok(_) => trace!("create_index_and_mapping_adb returned ok"),
    }
    */
}

// interface of the Rust code for js, exposes the `poll` and `shutdown` methods
declare_types! {
    pub class JsAdbIndexerEventEmitter for IndexingAdbEventEmitter {
        init(mut cx) {
            trace!("Rust: JsAdbIndexerEventEmitter");
            // TODO: We don't accept a file but a "device" which we open.
            let device= cx.argument::<JsString>(0)?.value();
            let tag = cx.argument::<JsString>(1)?.value();
            let out_path = path::PathBuf::from(cx.argument::<JsString>(2)?.value().as_str());
            let append = cx.argument::<JsBoolean>(3)?.value();
            let chunk_size = cx.argument::<JsNumber>(4)?.value() as usize;
            let arg_filter_conf = cx.argument::<JsValue>(5)?;
            let filter_conf: adb::filtering::AdbFilterConfig = neon_serde::from_value(&mut cx, arg_filter_conf)?;
            trace!("{:?}", filter_conf);

            let shutdown_channel = mpsc::channel();
            
            // TODO: Check if the device exists and can be connected to.

            /*
            let f = match fs::File::open(&file) {
                Ok(file) => file,
                Err(_) => {
                    eprint!("could not open {}", file);
                    std::process::exit(2)
                }
            };
            */

            let chunk_result_channel = mpsc::channel();
            let mut emitter = IndexingAdbEventEmitter {
                event_receiver: Arc::new(Mutex::new(chunk_result_channel.1)),
                shutdown_sender: shutdown_channel.0,
                task_thread: None,
            };

            /* We cannot use IndexingThreadConfig
            emitter.start_indexing_adb_in_thread(
                shutdown_channel.1,
                chunk_result_channel.0,
                chunk_size,
                IndexingThreadConfig {
                    device: device,
                    out_path,
                    append,
                    tag,
                    timestamps: false,
                },
                Some(filter_conf)
            );
            */
            Ok(emitter)
        }

        // will be called by JS to receive data in a loop, but care should be taken to only call it once at a time.
        method poll(mut cx) {
            // The callback to be executed when data is available
            // let cb = cx.argument::<JsFunction>(0)?;
            // let this = cx.this();

            // let events = cx.borrow(&this, |emitter| Arc::clone(&emitter.event_receiver));
            // let emitter = EventEmitterTask::new(events);

            // emitter.schedule(cb);
            Ok(JsUndefined::new().upcast())
        }

        // The shutdown method may be called to stop the Rust thread. It
        // will error if the thread has already been destroyed.
        method shutdown(mut cx) {
            trace!("shutdown called");
            let this = cx.this();

            cx.borrow(&this, |emitter| {
                match emitter.shutdown_sender.send(()) {
                    Err(e) => trace!("error happend when sending: {}", e),
                    Ok(()) => trace!("sent command Shutdown")
                }
            });
            Ok(JsUndefined::new().upcast())
        }
    }
}
