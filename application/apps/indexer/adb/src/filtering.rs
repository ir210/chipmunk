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

use serde::{Deserialize, Serialize};
use std::io::{Read};
use std::fs;
use std::collections::HashSet;
use crate::adb;
use std::iter::FromIterator;
use std::convert;
use rogcat::record::{Level};

#[derive(Serialize, Deserialize, Debug)]
pub struct AdbFilterConfig {
    pub min_log_level: Option<String>,
    pub tags: Option<Vec<String>>,
    pub message_patterns: Option<Vec<String>>,
}

pub struct ProcessedAdbFilterConfig {
    pub min_log_level: Option<Level>,
    pub tags: Option<HashSet<String>>,
    pub message_patterns: Option<HashSet<String>>,
}

pub fn process_filter_config(cfg: AdbFilterConfig) -> ProcessedAdbFilterConfig {
    ProcessedAdbFilterConfig {
        min_log_level: Some(Level::default()), //cfg.min_log_level.map(Level::from),
        tags: cfg.tags.map(HashSet::from_iter),
        message_patterns: cfg.message_patterns.map(HashSet::from_iter)
    }
}
