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

use crate::adb;
use crate::filtering;
use indexer_base::chunks::{ChunkFactory, ChunkResults};
use indexer_base::config::IndexingConfig;
use indexer_base::error_reporter::*;
use indexer_base::progress::*;
use indexer_base::utils;
use serde::Serialize;
use std::sync::mpsc::{self, TryRecvError};
use rogcat::record::{Record};
use rogcat::parser::{Parser};
use buf_redux::policy::MinBuffered;
use buf_redux::BufReader as ReduxReader;
use failure::{err_msg, Error};
use std::fs;
use std::io::{BufRead, BufWriter, Read, Write};
use std::str;
use std::fmt::Display;

pub fn create_index_and_mapping_adb(
    config: IndexingConfig,
    source_file_size: Option<usize>,
    filter_conf: Option<filtering::AdbFilterConfig>,
    shutdown_receiver: Option<mpsc::Receiver<()>>,
) -> Result<(), Error> {
    /*
    trace!("create_index_and_mapping_adb");
    match utils::next_line_nr(config.out_path) {
        Ok(initial_line_nr) => index_adb_file(config, filter_conf, initial_line_nr, source_file_size, update_channel, shutdown_receiver),
        Err(e) => {
            let content = format!("could not determine last line number of {:?} ({})", config.out_path, e);
            let _ = update_channel.send(Err(Notification {
                severity: Severity::ERROR,
                content: content.clone(),
                line: None,
            }));
            Err(err_msg(content))
        }
    }
    */
    Err(err_msg("Unimplemented!"))
}

pub fn index_adb_file(
    config: IndexingConfig,
    adb_filter: Option<filtering::AdbFilterConfig>,
    initial_line_nr: usize,
    source_file_size: Option<usize>,
    update_channel: mpsc::Sender<ChunkResults>,
    shutdown_receiver: Option<mpsc::Receiver<()>>,
) -> Result<(), Error> {
    trace!("index_adb_file");
    let mut chunk_count = 0usize;
    let mut last_byte_index = 0usize;
    let mut progress_percentage = 0usize;
    let mut stopped = false;
    let mut line_nr = initial_line_nr;

    let (out_file, current_out_file_size) = utils::get_out_file_and_size(config.append, &config.out_path)?;
    let filter_config = adb_filter.map(filtering::process_filter_config);

    let mut chunk_factory = ChunkFactory::new(config.chunk_size, current_out_file_size);
    let mut reader = ReduxReader::with_capacity(10 * 1024 * 1024, config.in_file).set_policy(MinBuffered(10 * 1024));
    let mut buf_writer = BufWriter::with_capacity(10 * 1024 * 1024, out_file);
    let mut processed_bytes = utils::get_processed_bytes(config.append, &config.out_path) as usize;

    /*
    loop {
        if stopped {
            info!("we were stopped in adb-indexer",);
            break;
        }

        match read_one_adb_message(&mut reader, filter_config.as_ref(), line_nr, processed_bytes, update_channel.clone()) {
            Ok(Some((consumed, Some(msg)))) => {
                //reader.consume(consumed);

                let written_bytes_len = 10usize; //utils::create_tagged_line_d(config.tag, &mut buf_writer, &msg, line_nr, true)?;
                processed_bytes += consumed;
                line_nr += 1;

                if let Some(chunk) = chunk_factory.create_chunk_if_needed(line_nr, written_bytes_len) {
                    if let Some(rx) = shutdown_receiver.as_ref() {
                        match rx.try_recv() {
                            Ok(_) | Err(TryRecvError::Disconnected) => {
                                info!("shutdown received in indexer");
                                stopped = true;
                            }
                            Err(TryRecvError::Empty) => (),
                        }
                    };
                    chunk_count += 1;
                    last_byte_index = chunk.b.1;
                    update_channel.send(Ok(IndexingProgress::GotItem { item: chunk }))?;
                    buf_writer.flush()?;
                }

                if let Some(file_size) = source_file_size {
                    let new_progress_percentage: usize = (processed_bytes as f64 / file_size as f64 * 100.0).round() as usize;
                    if new_progress_percentage != progress_percentage {
                        progress_percentage = new_progress_percentage;
                        match update_channel.send(Ok(IndexingProgress::Progress {
                            ticks: (processed_bytes, file_size),
                        })) {
                            Ok(()) => (),
                            Err(e) => println!("could not send: {}", e),
                        }
                    }
                }
            }
            Ok(Some((consumed, None))) => {
                //reader.consume(consumed);
                processed_bytes += consumed;
                if let Some(file_size) = source_file_size {
                    let new_progress_percentage = (processed_bytes as f64 / file_size as f64 * 100.).round() as usize;
                    if new_progress_percentage != progress_percentage {
                        progress_percentage = new_progress_percentage;
                        update_channel.send(Ok(IndexingProgress::Progress {
                            ticks: (processed_bytes, file_size),
                        }))?;
                    }
                }
            }
            Ok(None) => {
                break;
            }
            Err(e) => {
                println!("WIP: try to continue parsing: {}", e);
            }
        }
    }
    */

    buf_writer.flush()?;
    if let Some(chunk) = chunk_factory.create_last_chunk(line_nr, chunk_count == 0) {
        update_channel.send(Ok(IndexingProgress::GotItem { item: chunk.clone() }))?;
        chunk_count += 1;
        last_byte_index = chunk.b.1;
    }

    if chunk_count > 0 {
        let last_expected_byte_index = fs::metadata(config.out_path).map(|md| md.len() as usize)?;
        if last_expected_byte_index != last_byte_index {
            update_channel.send(Err(Notification {
                severity: Severity::ERROR,
                content: format!(
                    "error in computation! last byte in chunks is {} but should be {}",
                    last_byte_index,
                    last_expected_byte_index
                ),
                line: Some(line_nr),
            }))?;
        }
    }

    trace!("sending IndexingProgress::Finished");
    update_channel.send(Ok(IndexingProgress::Finished))?;
    Ok(())
}

fn read_one_adb_message<T: Read>(
    reader: &mut ReduxReader<T, MinBuffered>,
    filter_config: Option<&filtering::ProcessedAdbFilterConfig>,
    index: usize,
    processed_bytes: usize,
    update_channel: mpsc::Sender<ChunkResults>
) -> Result<Option<(usize, Option<Record>)>, Error> {
    let mut parser = Parser::default();

    /*
    loop {
        match reader.fill_buf() {
            Ok(content) => {
                if content.is_empty() {
                    return Ok(None);
                }

                let available = content.len();
                let record = "Hello";//parser.parse(content);
                let consumed = 10usize;//available - <TODO: total number of chars consumed>;
                Ok(Some((consumed, record)));
            }
            Err(e) => {
                return Err(err_msg(format!("error for reading logcat messages: {:?}", e)));
            }
        }
    }
    */
    Err(err_msg("Unimplemented!"))
}